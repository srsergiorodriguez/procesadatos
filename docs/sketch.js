function setup() {
  noCanvas();
  loaderGUI('counter', countRegex);
  loaderGUI('count-filter', countFilter);
  loaderGUI('matrix-formatter', formatMatrix);
  loaderGUI('network-formatter', formatNetwork);
  loaderGUI('media-preview', previewImgs);
}

function loaderGUI(name, func) {
  const container = "#" + name;
  const loaderDiv = createDiv().class("loader-div").parent(container);
  // Muestra la interfaz inicial de carga de archivos

  // El botón que se presiona para abrir el explorador de carga
  createElement("label")
    .class("input-label")
    .html("Seleccionar el archivo .csv")
    .attribute("for", name + "-file")
    .parent(loaderDiv)

  // Span que muestra el nombre del archivo o la advertencia de que no se ha seleccionado ningún archivo
  const loadMessage = createSpan("...No has seleccionado ningún archivo").class("load-message").parent(loaderDiv)

  // El input del archivo, permanece oculto y es remplazado por el botón "label"
  let input = createElement("input").parent(loaderDiv).class("default-input").id(name + "-file").attribute("type", "file").attribute("accept", "text/csv").changed((e) => {
    const file = e.target.files[0];
    loadMessage.html(file.name);
    const blob = window.URL.createObjectURL(file);
    func(container, blob);
  })
}

function countFilter(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".count-filter-div")) {selectAll(".count-filter-div").map(d=>d.remove())};
    const filterDiv = createDiv().class("count-filter-div").parent(container);

    createP("Selecciona la columna con respecto a la cual se va a filtrar").parent(filterDiv)
    const filterColumn = createSelect().parent(filterDiv);
    for (let e of data.columns) {
      filterColumn.option(e);
    }

    createP("Selecciona la columna con valores").parent(filterDiv)
    const valColumn = createSelect().parent(filterDiv);
    for (let e of data.columns) {
      valColumn.option(e);
    }

    createP("¿Cuantos quieres obtener luego del filtrado?").parent(filterDiv);
    const valNum = createInput(2).parent(filterDiv);

    const sortSelect = createSelect().parent(filterDiv);
    sortSelect.option("mayores");
    sortSelect.option("menores");
    sortSelect.selected("mayores");

    createButton("contar").parent(filterDiv).mouseClicked(() => {
      const generalCounts = {};
      for (let e of data) {
        if (generalCounts[e[filterColumn.value()]] === undefined) {
          generalCounts[e[filterColumn.value()]] = +e[valColumn.value()];
        } else {
          generalCounts[e[filterColumn.value()]] += +e[valColumn.value()];
        }
      }

      const sortFunction = sortSelect.value() === "mayores" ? d3.descending : d3.ascending;
      const generalEntries = Object.entries(generalCounts).sort((a,b) => sortFunction(a[1], b[1])).slice(0, +valNum.value());
      console.log(generalEntries);
      const validList = generalEntries.map(d => d[0]);
      const filtered = data.filter(d => validList.includes(d[filterColumn.value()])).map(d => Object.values(d));
      const newData = [[...data.columns], ...filtered];

      createStringDict(newData).saveTable('filtrado');   
    });
  });
}

function countRegex(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".count-regex-div")) {selectAll(".count-regex-div").map(d=>d.remove())};
    const filterDiv = createDiv().class("count-regex-div").parent(container);

    createP("Selecciona columna para agrupar (por ejemplo, por fecha), o deja 'ninguna' para contar en general: ").parent(filterDiv)
    const groupColumn = createSelect().parent(filterDiv);
    groupColumn.option("ninguna");
    for (let e of data.columns) {
      groupColumn.option(e);
    }

    createSpan(" Formato de fecha?:  ").parent(filterDiv);
    const dateFormat = createSelect().parent(filterDiv)
    const formats = ["no es fecha", "año", "mes", "día", "hora", "minuto"];
    const formatter = [
      d => d,
      d3.timeFormat("%Y"),
      d3.timeFormat("%Y-%m"),
      d3.timeFormat("%Y-%m-%d"),
      d3.timeFormat("%Y-%m-%dT%H:00:00"),
      d3.timeFormat("%Y-%m-%dT%H:%M:00")
    ]
    for (let i = 0; i < formats.length; i++) {
      dateFormat.option(formats[i], i);
    }

    createP("Si es conteo, deja 'ninguna', si es suma, selecciona la columna con valores: ").parent(filterDiv)
    const valColumn = createSelect().parent(filterDiv);
    valColumn.option("ninguna");
    for (let e of data.columns) {
      valColumn.option(e);
    }

    createP("Selecciona columna para contar: ").parent(filterDiv)
    const selectColumn = createSelect().parent(filterDiv);
    for (let e of data.columns) {
      selectColumn.option(e);
    }

    createP("Lista de expresiones para contar: ").parent(filterDiv);
    const expressionsInput = createInput("").parent(filterDiv);

    createButton("contar").parent(filterDiv).mouseClicked(() => {
      const splitRegex = /,[ ]*/;
      const expressionsList = expressionsInput.value().split(splitRegex).map(d => [d, new RegExp(d, 'i')]);

      if (groupColumn.value() === "ninguna") {
        const counts = {expresion: "frecuencia"};
        for (let exp of expressionsList) {
          counts[exp[0]] = 0;
        }
        for (let e of data) {
          for (let exp of expressionsList) {
            if (exp[1].test(e[selectColumn.value()])) {
              counts[exp[0]] += valColumn.value() === "ninguna" ? 1 : +e[valColumn.value()];
            }
          }
        }
        createStringDict(counts).saveTable('conteo');
      } else {
        const counts = [["grupo","expresion","frecuencia"]];
        const groups = [...new Set(data.map(d => {
          if (dateFormat.value() !== formats[0]) {
            const val = new Date(d[groupColumn.value()]);
            return formatter[dateFormat.value()](val)
          } else {
            return d[groupColumn.value()]
          }
        }))];

        const precount = {};
        for (let group of groups) {
          precount[group] = {};
          for (let i = 0; i < expressionsList.length; i++ ) {
            precount[group][expressionsList[i][0]] = 0;
          }
        }
        for (let e of data) {
          for (let exp of expressionsList) {
            if (exp[1].test(e[selectColumn.value()])) {
              if (dateFormat.value() !== formats[0]) {
                const val = new Date(e[groupColumn.value()]);
                precount[formatter[dateFormat.value()](val)][exp[0]] += valColumn.value() === "ninguna" ? 1 : +e[valColumn.value()];
              } else {
                precount[e[groupColumn.value()]][exp[0]] += valColumn.value() === "ninguna" ? 1 : +e[valColumn.value()];
              }
            }
          }
        }

        for (let group of Object.keys(precount)) {
          for (let exp of Object.keys(precount[group])) {
            counts.push([group, exp, precount[group][exp]]);
          }
        }
        createStringDict(counts).saveTable('tabla');     
      }
      
    })
  });
}

function formatMatrix(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".matrix-formatter-div")) {selectAll(".matrix-formatter-div").map(d=>d.remove())};
    const matrixFormatterDiv = createDiv().class("matrix-formatter-div").parent(container);

    createP("Selecciona el eje Y (p.e. fechas)").parent(matrixFormatterDiv)
    const groupColumn = createSelect().parent(matrixFormatterDiv);
    for (let e of data.columns) {
      groupColumn.option(e);
    }

    createP("Selecciona los valores numéricos (p.e. frecuencias)").parent(matrixFormatterDiv)
    const valColumn = createSelect().parent(matrixFormatterDiv);
    for (let e of data.columns) {
      valColumn.option(e);
    }
    valColumn.selected(data.columns[1]);

    createP("Selecciona el eje X (p.e. hashtags of palabras)").parent(matrixFormatterDiv)
    const catColumn = createSelect().parent(matrixFormatterDiv);
    for (let e of data.columns) {
      catColumn.option(e);
    }
    catColumn.selected(data.columns[2]);

    createButton("formatear").parent(matrixFormatterDiv).mouseClicked(() => {
      const categories = [...new Set(data.map(d => d[catColumn.value()]))];
      const catIndex = {};
      for (let i = 0; i < categories.length; i++) {
        catIndex[categories[i]] = i;
      }
      const formatted = {grupo: categories};
      const roll = d3.rollups(data, v => v[0][valColumn.value()], d => d[groupColumn.value()], d => d[catColumn.value()]);

      for (group of roll) {
        formatted[group[0]] = new Array(categories.length).fill("0");
        for (category of group[1]) {
          formatted[group[0]][catIndex[category[0]]] = category[1];
        }
      }
      createStringDict(formatted).saveTable('formateadoMatriz');
    });
  });
}

function previewImgs(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".preview-div")) {selectAll(".preview-div").map(d=>d.remove())};
    const previewDiv = createDiv().class("preview-div").parent(container);

    const checkBorder = createCheckbox('Borde por tipo?', false).parent(previewDiv);

    createP("Selecciona la columna con media").parent(previewDiv)
    const mediaColumn = createSelect().parent(previewDiv);
    for (let e of data.columns) {
      mediaColumn.option(e);
    }

    let selection = [];

    createButton("previsualizar").parent(previewDiv).mouseClicked(() => {
      selectAll(".border-check").map(d => d.remove());
      if (checkBorder.checked()) {
        createP("magenta: imagen / verde: gif / cyan: video").parent(previewDiv).class("border-check");
      }

      const mediaList = data.map(d => d[mediaColumn.value()]);

      selectAll(".masonry").map(d => d.remove());
      const imagesDiv = createDiv().class("masonry").parent(previewDiv);
      const mediaData = [];
      for (let i = 0; i < d3.min([2000, mediaList.length]); i++) {
        let url = mediaList[i];
        if (url === "") {continue}
        if (url.includes("; ")) {url = url.split("; ")[0]}
        let temp;
        if (url.includes("media")) {
          const key = /media\/(?<key>[_A-Za-z-0-9]*)./.exec(url).groups.key;
          const preview = `https://pbs.twimg.com/media/${key}.jpg`
          temp = {
            key,
            preview,
            type: "media"
          }
        } else if (url.includes("ext_tw_video")) {
          const id = /ext_tw_video(_thumb)?\/(?<id>[0-9]*)\//.exec(url).groups.id;
          const key = /\/(?<key>[_A-Za-z-0-9]{16})[.]/.exec(url).groups.key;
          const preview = `https://pbs.twimg.com/ext_tw_video_thumb/${id}/pu/img/${key}.jpg`
          // El preview en el formato de vicinitas no está sirviendo
          temp = {
            id,
            key,
            preview,
            type: "ext_tw_video"
          }
        } else if (url.includes("tweet_video")) {
          const key = /tweet_video(_thumb)?\/(?<key>[_A-Za-z-0-9]*)./.exec(url).groups.key;
          const preview = `https://pbs.twimg.com/tweet_video_thumb/${key}.jpg`;
          temp = {
            key,
            preview,
            type: "tweet_video"
          }
        } else {
          temp = {type: "no media"}
        }

        if (temp.type !== "no media") {
          let selected = false;
          let col = temp.type === "media" ? "magenta" : temp.type === "tweet_video" ? "limegreen" : temp.type === "ext_tw_video" ? "cyan" : "black";
          col = !checkBorder.checked() ? "black" : col;
          const img = createImg(temp.preview,"").class("masonry-item").style("border", `2px solid ${col}`).parent(imagesDiv);
          img.mouseClicked(() => {
            selected = selected === true ? false : true;
            if (selected === true) {
              selection[i] = data[i];
            } else if (selected === false) {
              selection[i] = undefined;
            }
            const border = selected === false ? `2px solid ${col}` : selected === true ? "2px solid rgb(255, 0, 0)" : "";
            img.style("border", border);
          })               
        }
             
        mediaData.push(temp);
      }
    });

    createButton("guardar datos de selección").parent(previewDiv).mouseClicked(() => {
      const filteredSelection = [[data.columns]];
      for (let e of selection) {
        if (e !== undefined) {
          filteredSelection.push(Object.values(e));
        }
      }
      createStringDict(filteredSelection).saveTable('seleccionImgs');
    });
  });
}

function formatNetwork(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".network-formatter-div")) {selectAll(".network-formatter-div").map(d=>d.remove())};
    const networkFormatterDiv = createDiv().class("network-formatter-div").parent(container);

    createP("Selecciona el label:").parent(networkFormatterDiv);
    const labelColumn = createSelect().parent(networkFormatterDiv);
    for (let e of data.columns) {
      labelColumn.option(e);
    }

    createP("Selecciona la columna con el contenido:").parent(networkFormatterDiv);
    const contentColumn = createSelect().parent(networkFormatterDiv);
    for (let e of data.columns) {
      contentColumn.option(e);
    }

    console.log(data);

    createButton("formatear").parent(networkFormatterDiv).mouseClicked(() => {
      const searchRegex = [/@[a-z0-9_]*/ig];
      const clean = [
        d => d.replace("@","")
      ];
      const edges = {};
      for (let e of data) {
        const matches = [...e[contentColumn.value()].matchAll(searchRegex[0])];
        if (edges[e[labelColumn.value()]] === undefined) {
          edges[e[labelColumn.value()]] = matches.map(d => clean[0](d[0]));
        } else {
          edges[e[labelColumn.value()]] = [...edges[e[labelColumn.value()]], ...matches.map(d => clean[0](d[0]))];
        }
      }

      for (let e of Object.keys(edges)) {
        const temp = {};
        for (let j of edges[e]) {
          if (temp[j] === undefined) {
            temp[j] = 1;
          } else {
            temp[j]++;
          }
        }
        edges[e] = temp;
      }

      createButton("exportar GDF (para Gephi)").parent(networkFormatterDiv).mouseClicked(() => {
        const writer = createWriter('grafo.gdf');
        writer.print("nodedef>name VARCHAR");
        for (let e of Object.keys(edges)) {
          writer.print(e);
        }
  
        writer.print("edgedef>node1 VARCHAR,node2 VARCHAR, weight DOUBLE");
        for (let e of Object.keys(edges)) {
          for (let j of Object.keys(edges[e])) {
            writer.print(`${e},${j},${edges[e][j]}`);
          }
        }
  
        writer.close();
        writer.clear();
      });

      createButton("exportar CSVs (para graphcommons y flourish)").parent(networkFormatterDiv).mouseClicked(() => {
        const writer = createWriter('conexiones.csv');
        writer.print("From Type, From Name, Edge, To Type, To Name");
        for (let e of Object.keys(edges)) {
          for (let j of Object.keys(edges[e])) {
            writer.print(`${labelColumn.value()},${e},MENTION,${labelColumn.value()},${j},${edges[e][j]}`);
          }
        }
  
        writer.close();
        writer.clear();

        const writer2 = createWriter('nodos.csv');
        writer2.print("Type, Name, Description, Image, Reference");
        for (let e of Object.keys(edges)) {
          writer2.print(`${labelColumn.value()},${e},,,`);
        }

        writer2.close();
        writer2.clear();
      });
    });
  });
}