from googleapiclient import discovery
from httplib2 import Http
from oauth2client import file, client, tools
import requests

import os
import shutil
from typing import Any, Iterator


class GooglePhotos:
    def __init__(self, secret: str):
        self.SCOPE = "https://www.googleapis.com/auth/photoslibrary"
        self.store = file.Storage("output/photos_api_storage.json")
        self.credentials = self.store.get()
        if not self.credentials or self.credentials.invalid:
            self.flow = client.flow_from_clientsecrets(secret, self.SCOPE)
            self.credentials = tools.run_flow(self.flow, self.store, flags=tools.argparser.parse_args([]))
        self.photos = discovery.build("photoslibrary", "v1", http=self.credentials.authorize(Http()), static_discovery=False)

    def get_album_id(self, album_title: str) -> str:
        albums = self.photos.albums()
        albums_meta = albums.list().execute()["albums"]
        return next(a for a in albums_meta if a["title"] == album_title)["id"]

    def get_album_contents(self, album_id: str | None = None, album_title: str | None = None) -> Iterator[dict[str, Any]]:
        if album_id is None:
            album_id = self.get_album_id(album_title)
        
        response = (self.photos
                        .mediaItems()
                        .search(body={"albumId": album_id})
                        .execute())
        yield from response["mediaItems"]
        while "nextPageToken" in response:
            response = (
                self.photos
                    .mediaItems()
                    .search(body={
                        "albumId": album_id,
                        "pageToken": response["nextPageToken"]
                        })
                    .execute()
            )
            yield from response["mediaItems"]

    @staticmethod
    def download_item(base_url: str, target_width: int, target_height: int, output_path: str) -> None:
        url = f"{base_url}=w{target_width}-h{target_height}"
        response = requests.get(url, stream=True)
        
        with open(output_path, 'wb') as out_file:
            shutil.copyfileobj(response.raw, out_file)

    def download_album(self, album_title: str, output_folder: str, target_width: int, target_height: int) -> None:
        for item in self.get_album_contents(album_title=album_title):
            print(".", end="")
            output_path = os.path.join(output_folder, item["filename"])
            self.download_item(item["baseUrl"], target_width, target_height, output_path)
