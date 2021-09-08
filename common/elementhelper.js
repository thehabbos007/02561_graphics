const addSelectElement = (el, selected, text, value) => {
  const option = document.createElement("option");
  option.text = text;
  option.value = value;
  if (selected) option.selected = true;
  el.add(option);
};

const addSelectElements = (el, items, dflt) => {
  items.forEach((item, idx) => {
    addSelectElement(el, idx === dflt, item[0], idx);
  });
};

const addButtonElement = (el, id, text, idx) => {
  const button = document.createElement("button");
  button.className = "draw-mode";
  button.id = id;
  button.innerHTML = text;
  button.setAttribute("data-idx", idx);
  el.appendChild(button);
};

const addButtonElements = (el, items) => {
  items.forEach((item, idx) => {
    addButtonElement(el, item[0], item[1], idx);
  });
};
