//bogot[áa], cali, yumbo, barranquilla, pereira, popay[áa]n, medell[íi]n, tunja

function setup() {
  noCanvas();
  loaderGUI('counter', countRegex);
  loaderGUI('count-filter', countFilter);
  loaderGUI('matrix-formatter', formatMatrix);
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
    let dateCheck = true;
    createCheckbox("es fecha?", dateCheck).parent(filterDiv).changed(()=>{
      dateCheck = !dateCheck;
    });
    let hourCheck = false;
    createCheckbox("con horas?", hourCheck).parent(filterDiv).changed(()=>{
      hourCheck = !hourCheck;
    });

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
        const format = hourCheck ? d3.timeFormat("%Y-%m-%dT%H:00:00.000Z") : d3.timeFormat("%Y-%m-%d");
        const counts = [["grupo","expresion","frecuencia"]];
        const groups = [...new Set(data.map(d => {
          if (dateCheck) {
            const val = new Date(d[groupColumn.value()]);
            return format(val)
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
              if (dateCheck) {
                const val = new Date(e[groupColumn.value()]);
                precount[format(val)][exp[0]] += valColumn.value() === "ninguna" ? 1 : +e[valColumn.value()];
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

    createP("Selecciona la columna con media").parent(previewDiv)
    const mediaColumn = createSelect().parent(previewDiv);
    for (let e of data.columns) {
      mediaColumn.option(e);
    }

    let selection = [];

    createButton("previsualizar").parent(previewDiv).mouseClicked(() => {
      const mediaList = data.map(d => d[mediaColumn.value()]);

      const imagesDiv = createDiv().class("masonry").parent(previewDiv);
      const mediaData = [];
      for (let i = 0; i < 2000; i++) {
        const url = mediaList[i];
        let temp;
        if (url.includes("media")) {
          temp = {
            media: mediaList[i],
            type: "media"
          }
          let selected = false;
          const img = createImg(mediaList[i],"").class("masonry-item").parent(imagesDiv);
          img.mouseClicked((e) => {
            selected = selected === true ? false : true;
            if (selected === true) {
              selection[i] = data[i];
            } else if (selected === false) {
              selection[i] = undefined;
            }
            const border = selected === false ? "2px solid rgb(0, 0, 0)" : selected === true ? "4px solid rgb(255, 0, 0)" : "";
            console.log(mediaList[i]);
            img.style("border", border);
          })
        } else if (url.includes("ext_tw_video")) {
          if (url.includes(".mp4")) {
            temp = {
            media: mediaList[i],
            type: "ext_tw_video"
            }
          } else {
            temp = {type: "no media"}
          }
        } else if (url.includes("tweet_video")) {
          temp = {
            media: mediaList[i],
            type: "tweet_video"
          }
        } else {
          temp = {type: "no media"}
        }
        mediaData.push(temp);
      }
    });

    createButton("guardar datos de selección").parent(previewDiv).mouseClicked(() => {
      const filteredSelection = [[data.columns]];
      for (let e of selection) {
        if (e !== undefined) {
          filteredSelection.push(Object.values(e).map(d=>'"'+d+'"'));
        }
      }
      createStringDict(filteredSelection).saveTable('seleccionImgs');
    });
  });
}