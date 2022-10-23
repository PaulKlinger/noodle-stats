window.onload = () => {
    fetch("./data/noodle_data.json")
    .then(response => response.json())
    .then((data) => {
        preprocess_data(data);
        create_graph(data);
        populate_images(data["images"]);
        // images change layout, so resize plot to fit
        window.onresize();
    })
}

preprocess_data = (data) => {
    for (const [index, img] of data["images"].entries()) {
        img["index"] = index;
    }
}

create_graph = (data) => {
    const DAY = 1000 * 60 * 60 * 24;

    const plot_elem = document.getElementById("main_graph");
    Plotly.newPlot(
        plot_elem,
        [
        {
            name: "food accepted",
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
            name: "food rejected",
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
            type: "scattergl",
            mode: "markers",
            x: data["images"].map(img => img["date"]),
            y: get_stacked_ys(data["images"].map(img => img["date"])),
            marker: {
                color: data["images"].map(img => "rgb(245, 182, 66)"),
                size: 10
            },
            customdata: data["images"]
        },
        {
            name: "selected photo",
            type: "scattergl",
            mode: "markers",
            x: [data["images"][0]["date"]],
            y: [1],
            marker: {
                color: "rgb(66, 224, 245)",
                size: 10
            },
        },
        {
            name: "weight",
            type: "scattergl",
            x: data["weight"]["date"],
            y: data["weight"]["weight"],
            hoverinfo: "x+text",
            hovertext: data["weight"]["weight"].map(x => `${x.toFixed(2)} g`),
            line: {color: "rgb(31, 119, 180)"},
        },
    ],
        {
            responsive: true,
            margin: {t: 0, b: 0, l: 0, r: 0},
            yaxis: {
                title: "weight [g] | food weight [g / 10]",
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            legend: {"orientation": "h"},
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
    Plotly.restyle(plot_elem, {"x[0]": plot_elem.data[2].x[i], "y[0]": plot_elem.data[2].y[i]}, 3);
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
        thumb_img_elem.setAttribute("src", "./data/thumbnails/" + img["fname"]);
        thumb_img_elem.classList.add("thumbnail_img");
        const date_text = document.createElement("p");
        date_text.append(img["date"]);
        thumb_elem.append(thumb_img_elem);
        thumb_elem.append(date_text);
        thumb_elem.classList.add("thumbnail");
        thumb_elem.onclick = () => {
            // highlight corresponding marker in plot
            set_highlight_photo_marker(img["index"]);

            full_image.setAttribute("src", "./data/images/" + img["fname"]);
            selected_thumbnail["thumbnail_elem"].classList.remove("selected_thumbnail");
            thumb_elem.classList.add("selected_thumbnail");
            selected_thumbnail = img;
        }
        thumbnails_elem.append(thumb_elem);
        img["thumbnail_elem"] = thumb_elem;
    }
    selected_thumbnail = images[0];
    images[0]["thumbnail_elem"].onclick();
}
