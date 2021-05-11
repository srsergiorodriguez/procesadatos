function setup() {
  noCanvas();
  loaderGUI('#counter', 'counter', countRegex);
  loaderGUI('#flourish-formatter', 'flourish-formatter', formatFlourish);
}

function loaderGUI(container, name, func) {
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

function formatFlourish(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".flourish-formatter-div")) {selectAll(".flourish-formatter-div").map(d=>d.remove())};
    const flourishFormatterDiv = createDiv().class(".flourish-formatter-div").parent(container);

    createP("Selecciona la columna con grupos (p.e. fechas)").parent(flourishFormatterDiv)
    const groupColumn = createSelect().parent(flourishFormatterDiv);
    for (let e of data.columns) {
      groupColumn.option(e);
    }

    createP("Selecciona la columna con valores (p.e. frecuencias)").parent(flourishFormatterDiv)
    const valColumn = createSelect().parent(flourishFormatterDiv);
    for (let e of data.columns) {
      valColumn.option(e);
    }
    valColumn.selected(data.columns[1]);

    createP("Selecciona la columna con categorías (p.e. hashtags of palabras)").parent(flourishFormatterDiv)
    const catColumn = createSelect().parent(flourishFormatterDiv);
    for (let e of data.columns) {
      catColumn.option(e);
    }
    catColumn.selected(data.columns[2]);

    createButton("formatear").parent(flourishFormatterDiv).mouseClicked(() => {
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
      createStringDict(formatted).saveTable('formateadoFlourish');
    });
  });
}

function countRegex(container, blob) {
  d3.csv(blob, d=>d).then(data => {
    if (selectAll(".count-regex-div")) {selectAll(".count-regex-div").map(d=>d.remove())};
    const filterDiv = createDiv().class(".count-regex-div").parent(container);

    createP("Selecciona columna para agrupar (por ejemplo, por fecha): ").parent(filterDiv)
    const groupColumn = createSelect().parent(filterDiv);
    groupColumn.option("ninguna");
    for (let e of data.columns) {
      groupColumn.option(e);
    }
    let dateCheck = true;
    createCheckbox("es fecha?", dateCheck).parent(filterDiv);

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
              counts[exp[0]]++
            }
          }
        }
        createStringDict(counts).saveTable('conteo');
      } else {
        const format = d3.timeFormat("%Y-%m-%d");
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
                precount[format(val)][exp[0]]++
              } else {
                precount[e[groupColumn.value()]][exp[0]]++
              }
            }
          }
        }

        for (let group of Object.keys(precount)) {
          for (let exp of Object.keys(precount[group])) {
            counts.push([group, exp, precount[group][exp]]);
          }
        }
        console.log(counts);
        createStringDict(counts).saveTable('tabla'); 
        
        // console.log(counts);
        // createStringDict(counts).saveTable('tabla');        
      }
      
    })
  });
}