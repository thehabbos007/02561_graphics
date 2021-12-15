// hlper to make ENUMS a la Golang
function iota(start = 0) {
  let count = start;
  return new Proxy(
    {},
    {
      get(o, prop) {
        if (prop in o) return o[prop];
        else return (o[prop] = count++);
      },
    }
  );
}

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
  button.setAttribute("data-idx", id);
  el.appendChild(button);
};

const addButtonElements = (el, items) => {
  items.forEach((item, idx) => {
    addButtonElement(el, item[0], item[1], idx);
  });
};

const setSliderValueTextAndCallback = (el, value, sliderCallback) => {
  el.parentElement.lastElementChild.innerHTML = `&nbsp;&nbsp;${value}`;
  sliderCallback(value);
};

const initSliderWithValue = (el, sliderCallback) => {
  const value = parseFloat(el.value);
  setSliderValueTextAndCallback(el, value, sliderCallback);
  el.oninput = (e) => {
    const value = parseFloat(e.target.value);
    setSliderValueTextAndCallback(el, value, sliderCallback);
  };
};

const initCheckboxedSlider = (checkboxEl, sliderEl, callback) => {
  let checked = false;
  checked = initToggleCheckbox(checkboxEl, (value) => {
    checked = value;
    if (checked) {
      const value = parseFloat(sliderEl.value);
      callback(value);
    } else {
      callback(null);
    }
  });
  const value = parseFloat(sliderEl.value);
  if (checked) callback(value);

  sliderEl.onchange = (e) => {
    const value = parseFloat(e.target.value);
    if (checked) {
      callback(value);
    }
  };
};

const initColorInput = (el, colorCallback) => {
  const initialValue = el.value
    .match(/[A-Za-z0-9]{2}/g)
    .map((v) => parseInt(v, 16) / 255);

  colorCallback(initialValue);
  el.oninput = (e) => {
    const value = el.value
      .match(/[A-Za-z0-9]{2}/g)
      .map((v) => parseInt(v, 16) / 255);
    colorCallback(value);
  };

  return initialValue;
};

const initToggleCheckbox = (el, callback) => {
  const currentCheckedState = el.checked;
  el.oninput = (e) => {
    const value = e.target.checked;
    callback(value);
  };
  return currentCheckedState;
};
