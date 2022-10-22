window.onload = () => {
    fetch("./data/noodle_data.json")
    .then(response => response.json())
    .then((data) => {
        create_graph(data);
        populate_images(data["images"]);
        // images change layout, so resize plot to fit
        window.onresize();
    })
}

create_graph = (data) => {
    const DAY = 1000 * 60 * 60 * 24;

    const plot_elem = document.getElementById("main_graph");
    Plotly.newPlot(
        plot_elem,
        [{
            name: "weight",
            x: data["weight"]["date"],
            y: data["weight"]["weight"],
            hoverinfo: "x+text",
            hovertext: data["weight"]["weight"].map(x => `${x.toFixed(2)} g`),
        },
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
            mode: "markers",
            x: data["images"].map(img => img["date"]),
            y: get_stacked_ys(data["images"].map(img => img["date"])),
            marker: {
                color: "rgba(245, 182, 66, 1)",
            }
        }
    ],
        {
            responsive: true,
            margin: {t: 0},
            yaxis: {
                title: "weight [g] | food weight [g / 10]",
            },
            legend: {"orientation": "h"}
        }
    );
    plot_elem.on("plotly_click", click_data => {
        const date = click_data.points[0].x;
        closest_image = find_closest_img_before(data["images"], date);
        closest_image["thumbnail_elem"].onclick();
        closest_image["thumbnail_elem"].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
    });
    window.onresize = () => Plotly.Plots.resize(plot_elem);
}

get_stacked_ys = (xs) => {
    const ys = [];
    let y = 1;
    let last_x = null;
    for (x of xs) {
        if (x == last_x) {y += 1;}
        else {y = 1;}
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
    const img_scroller = document.getElementById("image_scroller");
    const full_image = document.getElementById("full_image");
    let selected_thumbnail;
    for (const img of images) {
        const img_elem = document.createElement("img");
        img_elem.setAttribute("src", "./data/thumbnails/" + img["fname"]);
        img_elem.classList.add("thumbnail");
        img_elem.onclick = () => {
            full_image.setAttribute("src", "./data/images/" + img["fname"]);
            selected_thumbnail.classList.remove("selected_thumbnail");
            img_elem.classList.add("selected_thumbnail");
            selected_thumbnail = img_elem;
        }
        img_scroller.append(img_elem);
        img["thumbnail_elem"] = img_elem;
    }
    selected_thumbnail = images[0]["thumbnail_elem"];
    images[0]["thumbnail_elem"].onclick();
}
