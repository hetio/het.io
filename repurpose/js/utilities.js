var data_url = 'https://raw.githubusercontent.com/dhimmel/het.io-rep-data/fe91cef6834e7637b88aa1f54fc54954c61d4352/browser-tables/'

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
