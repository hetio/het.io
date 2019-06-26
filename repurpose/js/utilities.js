var data_url = 'https://raw.githubusercontent.com/dhimmel/het.io-rep-data/1a960f0e353586f8fe9f61b569919f24603d4344/browser-tables/';

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

function render_percent(data, type) {
  if (type != 'display') {return data};
  return data ? data.toLocaleString('en-us', {style: 'percent', minimumSignificantDigits:3, maximumSignificantDigits: 3}) : null;
}

function render_integer(data, type) {
  if (type != 'display') {return data};
  return data.toLocaleString('en-us');
}

var categories = {DM: 0, SYM: 1, NOT: 3};

function render_category(data, type) {
  if (type != 'sort') {return data};
  return data == null ? 4 : categories[data];
}

function render_name(data, type, row) {
  if (type != 'display') {return data};
  var description = row[row.length - 1];
  if (!description) {return data};
  return `<span data-toggle="tooltip" data-placement="auto bottom" title="${description}">${data}</span>`;
}

function activate_tooltip() {
  $(document).ready(function(){
    $("body").tooltip({ selector: '[data-toggle=tooltip]' });
  });
}
