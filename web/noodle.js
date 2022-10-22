window.onload = () => {
    fetch("./data/noodle_data.json")
    .then(response => response.json())
    .then((data) => {
        create_graph(data);
        populate_images(data["images"]);
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
            y: data["weight"]["weight"]
        },
        {
            name: "food accepted",
            type: "bar",
            x: data["feeding_accepted"]["date"],
            y: data["feeding_accepted"]["food_weight"].map(x => x * 10),
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
            width: 1.5 * DAY,
            marker: {
                color: 'rgba(214, 39, 40, 1)'
            }

        }
    ],
        {
            responsive: true,
            margin: {t: 0},
            yaxis: {
                title: "weight [g] | food weight [g / 10]",
            }
        }
    );
    plot_elem.on("plotly_click", data => {
        const date = data.points[0].x;

    });
    window.onresize = () => Plotly.Plots.resize(plot_elem);
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
