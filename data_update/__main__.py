import json
from glob import glob
import os
import re
import logging

import requests
import pygsheets
import numpy as np
import pandas as pd
import seaborn as sns

import matplotlib
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

import pysftp

from data_update.utils import GooglePhotos, put_r_portable

SECRETS = {
    "GDRIVE_SECRET": "./secrets/gdocs_service.json",
    "GPHOTOS_SECRET":"./secrets/google_photos_credentials.json",
    "GPHOTOS_SECRET_STORAGE": "./secrets/photos_api_storage.json",
    "FTP_SECRET": "./secrets/ftp_secrets.json",
}
GPHOTOS_SECRET_STORAGE_ENV_VAR = "GPHOTOS_SECRET_STORAGE"
FTP_SECRET_SOTRAGE_ENV_VAR = "FTP_SECRET"


def write_secrets_to_file():
    for secret_env, secret_path in SECRETS.items():
        os.makedirs(os.path.dirname(secret_path), exist_ok=True)
        if secret_env in os.environ:
            with open(secret_path, "w") as f:
                f.write(os.environ[secret_env])


def get_tabular_data() -> dict[str, pd.DataFrame]:
    #authorization
    gc = pygsheets.authorize(service_file="./secrets/gdocs_service.json")
    noodle_sheet = gc.open("🐍 Noodle stats 🐍")

    feeding_sheet = noodle_sheet.worksheet_by_title("feeding")
    weight_sheet = noodle_sheet.worksheet_by_title("weight")
    shedding_sheet = noodle_sheet.worksheet_by_title("shedding")

    feeding_df = feeding_sheet.get_as_df()
    weight_df = weight_sheet.get_as_df()
    shedding_df = shedding_sheet.get_as_df()

    weight_df["date"] = pd.to_datetime(weight_df["date"])
    feeding_df["date"] = pd.to_datetime(feeding_df["date"])
    shedding_df["date"] = pd.to_datetime(shedding_df["date"])
    feeding_df["accepted"] = feeding_df["accepted"] == "yes"
    feeding_df["food weight [g]"] = feeding_df["food weight [g]"].astype(float)

    shed_ranges = shedding_df.groupby("shed_idx")["date"].agg(["min", "max"])

    return {
        "feeding_df": feeding_df,
        "weight_df": weight_df,
        "shed_ranges": shed_ranges
    }


def get_existing_photos() -> set[str]:
    data = requests.get("https://almoturg.com/noodle/data/noodle_data.json").json()
    return {img["fname"] for img in data["images"]}


def get_photos() -> set[str]:
    existing_photos = get_existing_photos()

    p = GooglePhotos("./secrets/google_photos_credentials.json", "./secrets/photos_api_storage.json")
    p.download_album("Public Noodle", "./web/data/photos/thumbnails/", 200, 200, exclude=existing_photos)
    p.download_album("Public Noodle", "./web/data/photos/full_res/", 1500, 1500, exclude=existing_photos)

    return existing_photos | {os.path.basename(p) for p in glob("./web/data/photos/full_res/*")}


def create_json_data(shed_ranges: pd.DataFrame, feeding_df: pd.DataFrame, weight_df: pd.DataFrame, photo_fnames: set[str], output_path: str) -> None:
    os.makedirs(os.path.split(output_path)[0], exist_ok=True)

    images = [
        {"fname": fname,
        "date": pd.to_datetime(match.group(1)).strftime("%Y-%m-%d")}
        for fname in photo_fnames 
        if (match := re.search(r"(\d{8})_", fname)) is not None
    ]
    images.sort(key=lambda x: x["date"])

    data = {
        "shedding": [[r.min.strftime("%Y-%m-%d"), r.max.strftime("%Y-%m-%d")] for r in shed_ranges.itertuples()],
        "feeding_accepted": {
            "date": feeding_df.query("accepted")["date"].dt.strftime("%Y-%m-%d").to_list(),
            "food_weight": feeding_df.query("accepted")["food weight [g]"].to_list(),
        },
        "feeding_rejected": {
            "date": feeding_df.query("~accepted")["date"].dt.strftime("%Y-%m-%d").to_list(),
            "food_weight": feeding_df.query("~accepted")["food weight [g]"].to_list(),
        },
        "weight": {
            "date": weight_df["date"].dt.strftime("%Y-%m-%d").to_list(),
            "weight": weight_df["weight [g]"].to_list(),
        },
        "images": images
    }

    with open(output_path, "w") as f:
        json.dump(data, f)


def plot_static_graph(shed_ranges: pd.DataFrame, feeding_df: pd.DataFrame, weight_df: pd.DataFrame,) -> None:
    # start + end time of each shed and a nan y value in between to break the line
    shed_plot_xs = sum(([r.min, r.max, r.max + pd.Timedelta(hours=1)] for r in shed_ranges.itertuples()), start=[])
    shed_plot_ys = np.array(sum(([1, 1, np.nan] for _ in range(len(shed_ranges))), start=[]))

    blue, orange, green, red, *_ = sns.color_palette() # type: ignore

    fig, ax = plt.subplots(1, figsize=(20, 8))
    plt.plot(weight_df["date"], weight_df["weight [g]"], marker="o", linewidth=3, color=orange)


    f_accept = feeding_df.query("accepted")
    f_noaccept = feeding_df.query("~accepted")
    plt.bar(f_accept["date"], f_accept["food weight [g]"] * 10, color=green, width=2)
    plt.bar(f_noaccept["date"], f_noaccept["food weight [g]"] * 10, color=red, width=2)


    plt.xticks(rotation=30, ha="right")
    ax.yaxis.set_major_locator(ticker.MultipleLocator(10)) # type: ignore
    plt.grid(True, axis="y", linestyle=":")
    plt.ylabel("weight [g] | food weight [g / 10]")
    plt.xticks(pd.date_range(weight_df["date"].min() - pd.Timedelta(weeks=4), weight_df["date"].max() + pd.Timedelta(weeks=4), freq="MS"))

    plt.plot(shed_plot_xs, shed_plot_ys * 5, linewidth=5, marker="o")


    plt.legend(["weight", "sheds", "food accepted", "food not accepted"])

    plt.savefig("web/data/noodle_graph.svg")

    matplotlib.rcParams['figure.dpi'] = 300
    plt.savefig("web/data/noodle_graph.png", bbox_inches="tight")
    plt.close()


def upload_to_server():
    with open("./secrets/ftp_secrets.json") as f:
        ftp_secrets = json.load(f)
    
    cnopts = pysftp.CnOpts()
    cnopts.hostkeys = None # type: ignore

    with pysftp.Connection(
        ftp_secrets["NAMECHEAP_SERVER"], username=ftp_secrets["NAMECHEAP_USERNAME"],
        password=ftp_secrets["NAMECHEAP_PASSWORD"], port=ftp_secrets["NAMECHEAP_PORT"],
        cnopts=cnopts) as sftp:
        
        with sftp.cd('public_html'):
            put_r_portable(sftp, "web", "noodle", skip_if_exists=(lambda p: p[-4:] in (".jpg", ".gif")))


def main():
    logging.info("writing secrets to files")
    write_secrets_to_file()
    
    logging.info("getting data from gsheets & preprocessing")
    tab_data = get_tabular_data()

    logging.info("checking for new photos")
    all_photo_fnames = get_photos()

    logging.info("creating json data")
    create_json_data(**tab_data, photo_fnames=all_photo_fnames, output_path="./web/data/noodle_data.json")

    logging.info("plotting graph")
    plot_static_graph(**tab_data)

    logging.info("uploading files")
    upload_to_server()


if __name__ == "__main__":
    logging.getLogger().setLevel("INFO")
    main()