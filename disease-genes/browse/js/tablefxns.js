var barchart_description = "<p>The barchart shows the contribution of each feature towards the overall prediction. The contribution equals the feature coefficient from the logistic ridge regression model times the feature value computed between the specified gene and disease.</p>";

// Location to read data files (must set Access-Control-Allow-Origin header to *)
var base_data_url = "https://raw.githubusercontent.com/dhimmel/het.io-dag-data/54dd91f7c3c378b4064e8a99b022d4c637fe413f/browser/";

jQuery('#barchart_description').html(barchart_description);

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;
    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};


String.prototype.startsWith = function (str){
  return this.slice(0, str.length) == str;
};



function renderGeneCode(data, type, full) {
    if (type != 'display') {return data.slice(5);}
    var html_snip = '<a href="http://www.genenames.org/cgi-bin/gene_symbol_report?hgnc_id={0}" target="_blank">{1}</a>';
    return html_snip.format(data.slice(5), data);
}

function renderDiseaseCode(data, type, full) {
    if (type != 'display') {return data.slice(5);}
    var html_snip = '<a href="http://www.disease-ontology.org/?id={0}" target="_blank">{1}</a>';
    return html_snip.format(data, data);
}

function renderDiseaseName(data, type, row) {
    if (type != 'display') {return data;}
    var doid_code
    for (i = 0; i < row.length; i++) {
        var value = row[i];
        if (value.startsWith('DOID:')) {doid_code = value.slice(5); break;}
    }
    var html_snip = '<a href="/disease-genes/browse/disease/?disease=DOID_{0}">{1}</a>';
    return html_snip.format(doid_code, data);
}

function renderGeneName(data, type, row) {
    if (type != 'display') {return data;}
    var gene_code
    for (i = 0; i < row.length; i++) {
        var value = row[i];
        if (value.startsWith('HGNC:')) {gene_code = value.slice(5); break;}
    }
    var html_snip = '<a href="/disease-genes/browse/gene/?gene=HGNC_{0}">{1}</a>';
    return html_snip.format(gene_code, data);
}

function renderMetaPath(data, type, row) {
    if (type != 'display') {return data;}
    var display_text = data;
    //if (! (data.slice(0, 1) == 'G' && data.slice(-1) == 'D')) {display_text = '{' + data + '}'}
    var html_snip = '<a href="/disease-genes/browse/feature/?feature={0}">{1}</a>';
    return html_snip.format(row[0], display_text);
}

function renderPropability(data, type, row) {
    if (type != 'display') {return data;}
    return data + '%';
}

status_to_sort = {'-': 0, 'LC-S': 1, 'LC-P': 2, 'HC-S': 3, 'HC-P': 4}
function renderStatus(data, type, row) {
    if (type == 'display') {return data;}
    console.log(data.slice(-3))
    return status_to_sort[data.slice(-4)];
}



aoColumnDefs = [{aTargets: ['disease_name'], mRender: renderDiseaseName},
                {aTargets: ['disease_code'], mRender: renderDiseaseCode, sType: 'numeric'},
                {aTargets: ['gene_symbol'], mRender: renderGeneName},
                {aTargets: ['feature'], bVisible: false},
                {aTargets: ['metapath'], mRender: renderMetaPath},
                {aTargets: ['gene_code'], sType: 'numeric', mRender: renderGeneCode},
                {aTargets: ['disease_category']},
                {aTargets: ['pathophysiology']},
                {aTargets: ['positives'], sType: 'numeric'},
                {aTargets: ['status'], sType: 'numeric', mRender: renderStatus},
                {aTargets: ['associations'], sType: 'numeric'},
                {aTargets: ['auroc'], sType: 'numeric'},
                {aTargets: ['mean_prediction'], sType: 'numeric', mRender: renderPropability},
                {aTargets: ['prediction'], sType: 'numeric', mRender: renderPropability},
                {aTargets: ['standardized_coefficient'], sType: 'numeric'}];

var default_sort = ['prediction', 'standardized_coefficient', 'auroc', 'mean_prediction']


function dynamicTableFromURL(table_name, tsv_url, aoColumnDefs, identity) {
    if(typeof(aoColumnDefs) === 'undefined') aoColumnDefs = {};
    if(typeof(identity) === 'undefined') identity = {};

    jQuery(document).ready(function() {
        console.log(tsv_url);
        jQuery.ajax({
          url: tsv_url,
          dataType: 'text',
          success: function(tsv_string) {
            var table_array = jQuery.csv.toArrays(tsv_string, {'separator': '\t'});
            var fieldnames = table_array[0];
            table_array = table_array.slice(1);

            var default_sort_index;
            for (i=0; i < default_sort.length; i++) {
                default_sort_index = fieldnames.indexOf(default_sort[i]);
                if (default_sort_index > -1) {break;}
            }
            var table_header_html = fieldnames.map(function(x) {return '<th class="' + x + '">' + x + '</th>';}).join('');

            var table_html = '<table cellpadding="0" cellspacing="0" border="0" class="display" width="100%" id="table_' + table_name + '"><thead><tr>' + table_header_html + '</tr></thead><tbody></tbody></table>';

            jQuery('#dynamic_' + table_name).html(table_html);
            var otab = jQuery('#table_' + table_name).dataTable({'aaData': table_array, 'bProcessing': true, 'bJQueryUI': true, bAutoWidth: true, 'iDisplayLength': 25, 'aoColumnDefs': aoColumnDefs, sPaginationType: 'full_numbers', aaSorting:[[default_sort_index, 'desc']]});

            jQuery('#table_' + table_name).on('click', 'tr', function(event){
                var pred_col = fieldnames.indexOf('prediction');
                var doid_col = fieldnames.indexOf('disease_code');
                var hgnc_col = fieldnames.indexOf('gene_code');
				        var row_array = otab.fnGetData( this );
                if (pred_col != -1 && row_array != null) {
                    //var prediction = row_array[pred_col]
                    if (doid_col != -1) {
                        var doid_code = row_array[doid_col].replace(':', '_');
                        var title_name = row_array[fieldnames.indexOf('disease_name')];
                    }
                    else {var doid_code = identity['doid_code']}
                    if (hgnc_col != -1) {
                        var hgnc_code = row_array[hgnc_col].replace(':', '_');
                        var title_name = row_array[fieldnames.indexOf('gene_symbol')];
                    }
                    else {var hgnc_code = identity['hgnc_code']}
                    console.log([doid_code, hgnc_code]);
                    google.setOnLoadCallback(termChart(doid_code, hgnc_code, title_name));
                }
            });
        } // ends success
      }).error(function() {
          window.location = '/disease-genes/browse';
        });;

    });
}



function termChart(doid_code, hgnc_code, title_name) {
    jQuery(document).ready(function() {
    var term_path = base_data_url.concat('prediction-terms/{0}/{1}.txt'.f(doid_code, hgnc_code));
    jQuery.get(term_path, dataType='text', success=function(tsv_string) {
        var table_array = jQuery.csv.toArrays(tsv_string, {'separator': '\t'});
        for (i = 1; i < table_array.length; i++) {
            table_array[i][1] = parseFloat(table_array[i][1])
        }
        var table_dt = google.visualization.arrayToDataTable(table_array, false);
        table_dt.sort([{column: 1}, {column: 0}]);
        var chart = new google.visualization.BarChart(document.getElementById('barchart'));
        chart_title = 'Components of the predicted association with {0}'.f(title_name)
        var options = {title: chart_title,
			hAxis: {title: 'Term (Feature x Coefficient)'},
			vAxis: {direction: -1}, legend: { position: "none" }};
        chart.draw(table_dt, options);
    });
    });
}
