(function () {
  var ROOT = new URL("../../", document.currentScript.src).href;

  var JSON_SOURCES = {};
  JSON_SOURCES[DATA_KEYS.USERS] = ROOT + "data/nguoi_dung.json";
  JSON_SOURCES[DATA_KEYS.SERVICES] = ROOT + "data/dich_vu.json";
  JSON_SOURCES[DATA_KEYS.PETS] = ROOT + "data/thu_cung.json";
  JSON_SOURCES[DATA_KEYS.APPOINTMENTS] = ROOT + "data/lich_hen.json";
  JSON_SOURCES[DATA_KEYS.APPOINTMENT_DETAILS] = ROOT + "data/chi_tiet_lich_hen.json";
  JSON_SOURCES[DATA_KEYS.REVIEWS] = ROOT + "data/danh_gia.json";

  function getData(key) {
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  }

  function setData(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  function fetchJSON(filePath, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", filePath, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 0) {
          try {
            var data = JSON.parse(xhr.responseText);
            callback(null, data);
          } catch (err) {
            callback(err, null);
          }
        } else {
          callback("Error: " + xhr.status, null);
        }
      }
    };
    xhr.send();
  }

  function initData() {
    var storedVersion = localStorage.getItem(DATA_KEYS.DATA_VERSION);
    var forceReload = storedVersion !== DATA_VERSION;
    var keys = Object.keys(JSON_SOURCES);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var filePath = JSON_SOURCES[key];
      var existingData = getData(key);
      
      if (forceReload || !existingData || existingData.length === 0) {
        (function(k) {
          fetchJSON(filePath, function(err, data) {
            if (!err && data) {
              setData(k, data);
            }
          });
        })(key);
      }
    }
    
    if (forceReload) {
      localStorage.setItem(DATA_KEYS.DATA_VERSION, DATA_VERSION);
    }
  }

  function resetData() {
    var keys = Object.keys(DATA_KEYS);
    for(var i = 0; i < keys.length; i++) {
      localStorage.removeItem(DATA_KEYS[keys[i]]);
    }
    initData();
  }

  function getCurrentUser() {
    var raw = getData(DATA_KEYS.CURRENT_USER);
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    return getItemById(DATA_KEYS.USERS, "ma_nguoi_dung", raw);
  }

  function setCurrentUser(user) {
    if (user) setData(DATA_KEYS.CURRENT_USER, user);
  }

  function clearCurrentUser() {
    localStorage.removeItem(DATA_KEYS.CURRENT_USER);
  }

  function generateId(prefix, key, idField, padLength) {
    padLength = padLength || 3;
    var list = getData(key) || [];
    var maxNum = 0;
    for (var i = 0; i < list.length; i++) {
      var currentId = String(list[i][idField] || "");
      if (currentId.indexOf(prefix) === 0) { 
        var numPart = parseInt(currentId.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    
    var newNumStr = String(maxNum + 1);
    while (newNumStr.length < padLength) {
      newNumStr = "0" + newNumStr;
    }
    return prefix + newNumStr;
  }

  function getItemById(key, idField, idValue) {
    var list = getData(key) || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i][idField]) === String(idValue)) {
        return list[i];
      }
    }
    return null;
  }

  function addItem(key, newItem) {
    var list = getData(key) || [];
    list.push(newItem);
    setData(key, list);
    return newItem;
  }

  function updateItem(key, idField, updatedItem) {
    var list = getData(key) || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i][idField]) === String(updatedItem[idField])) {
        for (var prop in updatedItem) {
          if (updatedItem.hasOwnProperty(prop)) {
            list[i][prop] = updatedItem[prop];
          }
        }
        setData(key, list);
        return true;
      }
    }
    return false;
  }

  function deleteItem(key, idField, idValue) {
    var list = getData(key) || [];
    var filteredList = [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i][idField]) !== String(idValue)) {
        filteredList.push(list[i]);
      }
    }
    if (filteredList.length !== list.length) {
      setData(key, filteredList);
      return true;
    }
    return false;
  }

  var Storage = {
    initData: initData,
    resetData: resetData,
    getData: getData,
    setData: setData,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    clearCurrentUser: clearCurrentUser,
    generateId: generateId,
    getItemById: getItemById,
    addItem: addItem,
    updateItem: updateItem,
    deleteItem: deleteItem
  };

  if (typeof window !== "undefined") {
    window.Storage = Storage;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Storage;
  }
})();