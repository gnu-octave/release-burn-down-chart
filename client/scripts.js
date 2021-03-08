/**
 * Global variables.
 */
var queryList;


$(document).ready(function(){
  queryList = new QueryWidgetList($("#queries")[0], $("#appImportExport")[0]);

  $("#newQueryButton").click(function() { queryList.add(Query.getDefault()) });

  $(".collapser").click(function() { $(this).next().collapse("toggle"); });
});


class QueryWidgetList {
  constructor(rootNode, importExportNode) {
    this.items = [];
    this.rootNode         = rootNode;
    this.importExportNode = importExportNode;
    this.custom  = JSON.parse(localStorage.getItem("customQueries"));
    this.default = JSON.parse(localStorage.getItem("defaultQueries"));
    if (!this.custom) {
      this.custom = this.default;
    }
    this.default.forEach(e => this.add(new Query(e.label, e.url, e.api, '')));
  }

  update(item, newNode) {
    var old = item.getNode();
    if (old) {
      this.rootNode.replaceChild(newNode, old);
    } else {
      this.rootNode.appendChild(newNode);
    }
  }

  getDefaultQueriesJSON () { return JSON.stringify(this.default); }
  getCustomQueriesJSON  () { return JSON.stringify(this.custom);  }

  save() {
    localStorage.setItem("customQueries", this.getCustomQueriesJSON());
  }

  add(query, options={silent: true, readonly: true}) {
    var widget = new QueryWidget(this, query, options);
    this.items.push(widget);
    widget.send(options);
  }
}


/**
 * Load locally stored items.
 */
class Query {
  constructor(label, url, apiParams, result) {
    this.label  = label;
    this.url    = url;
    this.api    = apiParams.trim().replaceAll(/\s+/g, "&");
    this.setResultHTML(result);
  }
  static getDefault() {
    var value = document.location.search.substring(1);
    value = (value ? value : localStorage.getItem("defaultQuery"));
    return new Query('New query', '', value, '');
  }
  static getFromGETParams() {
    return new Query('', '', localStorage.getItem("defaultQuery"), '');;
  }
  getLabel() {
    return this.label;
  }
  getURL() {
    return this.url;
  }
  getPermaLink() {
    return localStorage.getItem("apiURL") + '?' + this.api;
  }
  getPermaLinkParams() {
    return this.api;
  }
  setResultHTML(str) {
    this.result = str;
    this.resultCount = this.__getResultCount();
  }
  getResultHTML() {
    return this.result;
  }
  getResultCount() {
    return this.resultCount;
  }
  __getResultCount() {
    if (!this.result) {
      return 0;
    }
    if (this.result.substr(0, 6) === "<table") {
      // ignore head line
      return (this.result.match(/<tr/g) || []).length - 1;
    } else {
      try {
        return JSON.parse(this.result).length;
      } catch (e) {
        // Must be CSV and count rows.  Ignore head line and last newline.
        return this.result.split("\n").length - 2;
      }
    }
  }
}


class QueryWidget {
  constructor(list, query, options) {
    this.list     = list;
    this.query    = query;
    this.readonly = options.readonly;

    // Sub-widgets that need access.
    this.url = null;
    this.label = null;
    this.parameter = null;
    this.refreshButton = null;

    this.node = null;
    this.repaint();
  }

  toggleReadOnly() {
    this.readonly = !this.readonly;
    this.repaint();
  }

  setResultHTML(result) {
    this.query.setResultHTML(result);
    this.repaint();
  }

  getNode() { return this.node };

  getQuery() {
    return ((this.readonly)
            ? this.query
            : new Query(this.label.value, this.url.value,
                        this.parameter.value, this.query.getResultHTML()));
  }

  repaint() {
    const self = this;
    var query  = this.query;
    var params = query.getPermaLinkParams().replaceAll("&", "\n");
    var element = document.createElement(null);
    if (this.readonly) {
      var labelHTML = `
        <div class="font-weight-bold mt-2">${query.getLabel()}</div>`;
      var buttonsEditClass = "secondary";
      var buttonsEditIcon  = "far fa-edit";
      var buttonsHTML = "";
      var formHTML = "";
    } else {
      var labelHTML = `
        <input type="text" class="form-control" value="${query.getLabel()}">`;
      var buttonsEditClass = "warning";
      var buttonsEditIcon  = "fas fa-ban";
      var buttonsHTML = `
        <div class="btn-group w-100 mt-1" role="group">
          <button type="button" class="btn btn-success form-control">
            <i class="far fa-save"></i>
          </button>
          <button type="button" class="btn btn-danger form-control">
            <i class="far fa-trash-alt"></i>
          </button>
        </div>`;
      var formHTML = `
      <div class="form-group input-group">
        <div class="input-group-prepend">
          <div class="input-group-text">url</div>
        </div>
        <input type="url" value="${query.getURL()}" class="form-control">
      </div>
      <div class="form-group input-group">
        <div class="input-group-prepend">
          <div class="input-group-text">API parameter</div>
        </div>
        <textarea class="form-control">${params}</textarea>
      </div>`;
    }
    element.innerHTML = `
    <div class="accordion m-1">
      <div class="card">
        <div class="card-header card-header-mod">
          <div class="row">
            <div class="col-3 col-md-2 col-lg-2">
              <button type="button"
                      class="btn btn-info button-width-mod text-left"
                      data-toggle="collapse"
                      data-target=""
                      aria-expanded="true">
                &nbsp;<i class="fas fa-plus"></i>&nbsp;
                <span class="badge badge-pill badge-light badge-light-mod">
                  ${query.getResultCount()}
                </span>
              </button>
            </div>
            <div class="col">
              ${labelHTML}
            </div>
            <div class="col col-md-3">
              <div class="btn-group w-100" role="group">
                <button type="button"
                        class="btn btn-info form-control">
                  <i class="fas fa-sync"></i>
                </button>
                <button type="button"
                        class="btn btn-${buttonsEditClass} form-control">
                  <i class="${buttonsEditIcon}"></i>
                </button>
                <button type="button"
                        class="btn btn-info form-control">
                  <i class="far fa-clipboard"></i>
                </button>
              </div>
              ${buttonsHTML}
            </div>
          </div>
        </div>
        <div class="card-body collapse">
          ${formHTML}
          <div class="overflow-auto">
            ${query.getResultHTML()}
          </div>
        </div>
      </div>
    </div>
    `;
    element = element.firstElementChild;
    var buttons = element.getElementsByTagName("button");  // order given above
    var toggleButton   = buttons[0];
        toggleButton.addEventListener("click", function(event) {
          $(this).closest("div.card").children("div.card-body").collapse("toggle");
        });
    this.refreshButton = buttons[1];
    this.refreshButton.addEventListener("click", function(event) {
        self.send();
      });
    var editButton = buttons[2];
        editButton.addEventListener("click", function(event) {
        self.toggleReadOnly();
      });
    var copyButton = buttons[3];
        copyButton.addEventListener("click", function(event) {
        var temp = $("<input>");
        $("body").append(temp);
        temp.val(self.getQuery().getPermaLink()).select();
        document.execCommand("copy");
        temp.remove();
        showPopup("info", "Copied to clipboard.");
      });

    if (this.readonly) {
      this.label     = null;
      this.url       = null;
      this.parameter = null;
    } else {
      var saveButton = buttons[4];
          saveButton.addEventListener("click", function(event) {
              self.toggleReadOnly();
            });
      var cancelButton = buttons[5];
          cancelButton.addEventListener("click", function(event) {
              self.toggleReadOnly();
            });
      var deleteButton = buttons[6];

      var inputs = element.getElementsByTagName("input");
      this.label = inputs[0];
      this.url   = inputs[1];
      this.parameter = element.getElementsByTagName("textarea")[0];
      var adjustHeight = function(event) {
        this.style.height = "1px";
        this.style.height = this.scrollHeight + "px";
        };
      this.parameter.addEventListener("change", adjustHeight);
      this.parameter.addEventListener("focus",  adjustHeight);
      this.parameter.addEventListener("keyup",  adjustHeight);
    }

    $(element).find("table").addClass("table");
    $(element).find("table").addClass("table-borderless");
    $(element).find("table").addClass("table-hover");
    $(element).find("table").addClass("table-responsive");

    // Copy state from previous node.
    if (this.node) {
      if ($(this.node).find('div.card-body')[0].classList.contains("show")) {
            $(element).find('div.card-body')[0].classList.add("show");
      }
    }

    this.list.update(this, element);
    this.node = element;
  }

  markBusy() {
    $(this.refreshButton).disabled = true;
    $(this.refreshButton).children('i')[0].classList.toggle("fa-spin");
  }

  markFree() {
    $(this.refreshButton).disabled = false;
    $(this.refreshButton).children('i')[0].classList.toggle("fa-spin");
  }

  send(params) {
    params = (params ? params : {});
    const self = this;
    var query = this.getQuery();
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == XMLHttpRequest.DONE) {
        self.markFree();
        params.queryForm = self;
        apiRequestHandleResult(this, params);
      }};
    xhttp.open("GET", "api.php?" + query.getPermaLinkParams(), true);
    xhttp.send();
    self.markBusy();
  }
}


function showPopup(type, message) {
  var delay = 10000;  // milliseconds
  var headText = "Info";
  switch(type) {
    case "warning":
      headText = "⚠️ Warning";
      break;
    case "error":
      headText = "❌ Error";
      delay *= 10;
      break;
    case "success":
      headText = "✅ Success";
      break;
    default:
      type = "info";
  }
  var element = document.createElement(null);
  element.innerHTML = `
  <div role="alert" aria-life="assertive" aria-atomic="true"
       class="toast md-toast-${type}">
    <div class="toast-header md-toast-${type}">
      <strong class="mr-auto">${headText}</strong>
      <button type="button" class="ml-2 mb-1 close" data-dismiss="toast"
              aria-label="Close">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="toast-body md-toast-${type}">
      ${message}
    </div>
  </div>
  `;
  element = element.firstElementChild;
  document.getElementById("toasts").appendChild(element);
  $(element).toast({delay: delay});
  $(element).toast('show');
  setTimeout(function(){ element.remove(); }, delay);
}


function apiUpdateItem(node, tracker, id) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == XMLHttpRequest.DONE) {
      apiRequestHandleResult(this,
                             {message: "<b>" + tracker + " #" + id + "</b>"});
    }};
  xhttp.open("GET", "api.php?Action=update&TrackerID=" + tracker
                    + "&ItemID=" + id, true);
  xhttp.send();
  node.parentNode.innerHTML = '❓';
}


function apiRequestHandleResult(request, params) {
  if (request.status == 200) {
    var answer = request.responseText;
    params = (params ? params : {});
    /**
     * The API server will answer with either a JSON string of the form:
     *
     *   {"state": ["success", "error", "warning", "info"], "message": string}
     *
     * or with a plain string containing the queried result, for example.
     */
    try {
      var answer = JSON.parse(answer);
    } catch (e) {
      // ignore
    }
    if (answer.state) {
      showPopup(answer.state, (params.message ? params.message + ' ' : '')
                              + answer.message);
    } else if (params.queryForm) {
      params.queryForm.setResultHTML(request.responseText);
      if (!params.silent) {
        showPopup("success", "");
      }
    } else {
      showPopup("warning", "Unknown server response: " + request.responseText);
    }
  } else {
    showPopup("error", "Request failed: " + request.responseText);
  }
}
