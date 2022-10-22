window.onload = () => {
    fetch("./data/noodle_data.json")
    .then(response => response.json())
    .then((data) => {
        create_graph(data);
        populate_images(data);
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
        console.log(data.points);
    });
}

populate_images = (data) => {
    img_container = document.getElementById("images")
    data["images"].forEach(x => {
        console.log(x);
        const img = document.createElement("img");
        img.setAttribute("src", "./data/thumbnails/" + x["fname"]);
        img.setAttribute("class", "image");
        img_container.append(img);
        x["thumbnail_elem"] = img;
    })
}
