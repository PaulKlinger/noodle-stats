window.onload = () => {
    fetch("./data/noodle_data.json")
    .then(response => response.json())
    .then((data) => {
        preprocess_data(data);
        populate_images(data["images"]);
        create_graph(data);
        data["images"][0]["thumbnail_elem"].onclick();
    })
}

preprocess_data = (data) => {
    for (const [index, img] of data["images"].entries()) {
        img["index"] = index;
    }
    const shedding_x = [];
    for (const [start, end] of data["shedding"]) {
        shedding_x.push(start, end, null);
    }
    data["shedding_x"] = shedding_x;
}

create_graph = (data) => {
    const DAY = 1000 * 60 * 60 * 24;

    const plot_elem = document.getElementById("main_graph");
    Plotly.newPlot(
        plot_elem,
        [
        {
            name: "food accepted [g / 10]",
            type: "bar",
            x: data["feeding_accepted"]["date"],
            y: data["feeding_accepted"]["food_weight"].map(x => x * 10),
            hoverinfo: "x+text",
            hovertext: data["feeding_accepted"]["food_weight"].map(x => `${x.toFixed(2)} g`),
            width: 1.5 * DAY,
            marker: {
                color: 'rgba(44, 160, 44, 1)',
                width: '10px'
            }

        },
        {
            name: "food rejected [g / 10]",
            type: "bar",
            x: data["feeding_rejected"]["date"],
            y: data["feeding_rejected"]["food_weight"].map(x => x * 10),
            hoverinfo: "x+text",
            hovertext: data["feeding_rejected"]["food_weight"].map(x => `${x.toFixed(2)} g`),
            width: 1.5 * DAY,
            marker: {
                color: 'rgba(214, 39, 40, 1)'
            }
        },
        {
            name: "photos",
            type: "scatter",
            mode: "markers",
            x: data["images"].map(img => img["date"]),
            y: get_stacked_ys(data["images"].map(img => img["date"])),
            marker: {
                color: "rgb(245, 158, 37)",
                size: 10
            },
            customdata: data["images"]
        },
        {
            name: "shedding",
            type: "scatter",
            mode: "lines+markers",
            connectgaps: false,
            x: data["shedding_x"],
            y: data["shedding_x"].map(x => x === null ? null : -1),
            marker: {
                color: "#333",
                size: 10,
                symbol: "x",
            },
            line: {color: "#333"},
        },
        {
            name: "selected photo",
            type: "scatter",
            mode: "markers",
            x: [data["images"][0]["date"]],
            y: [1],
            marker: {
                color: "rgb(66, 164, 245)",
                size: 10
            },
        },
        {
            name: "weight [g]",
            type: "scatter",
            x: data["weight"]["date"],
            y: data["weight"]["weight"],
            hoverinfo: "x+text",
            hovertext: data["weight"]["weight"].map(x => `${x.toFixed(2)} g`),
            line: {color: "rgb(31, 119, 180)"},
        },
    ],
        {
            margin: {b: 0, r: 0, t: 0, l: 30},
            responsive: true,
            yaxis: {
                dtick: 10,
                tick0: 0,
                tickformat: ".0f",
                tickmode: "linear",
                ticklabelstep: 1,
                showticklabels: true,
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            legend: {"orientation": "h", "font": {"size": 11}},
        }
    );
    plot_elem.on("plotly_click", click_data => {
        const point = click_data.points[0];
        let closest_image;
        if (point.data["name"] === "photos") {
            closest_image = point.customdata;
        } else {
            closest_image = find_closest_img_before(data["images"], point.x);
        }
        closest_image["thumbnail_elem"].onclick();
        closest_image["thumbnail_elem"].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
    });
    window.onresize = () => Plotly.Plots.resize(plot_elem);
}

set_highlight_photo_marker = (i) => {
    const plot_elem = document.getElementById("main_graph");
    Plotly.restyle(plot_elem, {"x[0]": plot_elem.data[2].x[i], "y[0]": plot_elem.data[2].y[i]}, 4);
}

get_stacked_ys = (xs) => {
    const ys = [];
    const init_y = 1;
    let y = init_y;
    let last_x = null;
    for (x of xs) {
        if (x == last_x) {y += 2;}
        else {y = init_y;}
        ys.push(y);
        last_x= x;
    }
    return ys;
}

find_closest_img_before = (images, target_date) => {
    let closest_image = images[0];
    for (const img of images) {
        if (img["date"] > target_date) {
            return closest_image;
        }
        closest_image = img;
    }
}

populate_images = (images) => {
    const thumbnails_elem = document.getElementById("thumbnails");
    const full_image = document.getElementById("full_image");
    let selected_thumbnail;
    for (const img of images) {
        const thumb_elem = document.createElement("div");
        const thumb_img_elem = document.createElement("img");
        thumb_img_elem.setAttribute("src", "./data/photos/thumbnails/" + img["fname"]);
        thumb_img_elem.classList.add("thumbnail_img");
        const date_text = document.createElement("p");
        date_text.append(img["date"]);
        thumb_elem.append(thumb_img_elem);
        thumb_elem.append(date_text);
        thumb_elem.classList.add("thumbnail");
        thumb_elem.onclick = () => {
            // highlight corresponding marker in plot
            set_highlight_photo_marker(img["index"]);

            full_image.setAttribute("src", "./data/photos/full_res/" + img["fname"]);
            selected_thumbnail["thumbnail_elem"].classList.remove("selected_thumbnail");
            thumb_elem.classList.add("selected_thumbnail");
            selected_thumbnail = img;
        }
        thumbnails_elem.append(thumb_elem);
        img["thumbnail_elem"] = thumb_elem;
    }
    selected_thumbnail = images[0];
}
