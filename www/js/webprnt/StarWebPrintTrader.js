var StarWebPrintTrader = function(a) {
    this.onError = this.onReceive = this.checkedblock = this.url = null;
    void 0 != a && (void 0 != a.url && (this.url = a.url), void 0 != a.checkedblock && (this.checkedblock = a.checkedblock))
};
StarWebPrintTrader.prototype.sendMessage = function(a) {
    var b = "<root";
    void 0 != a.checkedblock ? !1 == a.checkedblock && (b += ' checkedblock="false"') : !1 == this.checkedblock && (b += ' checkedblock="false"');
    var b = b + (">" + a.request + "</root>"),
        d;
    d = '<StarWebPrint xmlns="http://www.star-m.jp" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><Request>';
    d += this._encodeEscapeSequence(b);
    d += "</Request>";
    d += "</StarWebPrint>";
    var c = null;
    if (window.XMLHttpRequest) c = new XMLHttpRequest;
    else if (window.ActiveXObject) c = new ActiveXObject("Microsoft.XMLHTTP");
    else throw Error("XMLHttpRequest is not supported.");
    void 0 != a.url ? c.open("POST", a.url, !0) : c.open("POST", this.url, !0);
    c.setRequestHeader("Content-Type", "text/xml; charset=UTF-8");
    var e = this;
    
    c.timeout = 10000;
        
    c.onreadystatechange = function() {
        if (4 == c.readyState)
            if (200 == c.status) {
                var a = c.responseXML.getElementsByTagName("Response");
                if (0 < a.length) e.onReceive && (a = a[0].childNodes[0].nodeValue, e.onReceive({
                    traderSuccess: a.slice(a.indexOf("<success>") + 9, a.indexOf("</success>")),
                    traderCode: a.slice(a.indexOf("<code>") + 6, a.indexOf("</code>")),
                    traderStatus: a.slice(a.indexOf("<status>") + 8, a.indexOf("</status>")),
                    status: c.status,
                    responseText: c.responseText
                }));
                else if (e.onError) e.onError({
                    status: c.status,
                    responseText: c.responseText
                })
            } 
            else if (0 == c.status) {
            	e.onTimeout();
            }
            else if (e.onError) e.onError({
            status: c.status,
            responseText: c.responseText
        })
    };
    c.send(d)
};
StarWebPrintTrader.prototype.isCoverOpen = function(a) {
    return parseInt(a.traderStatus.substr(4, 2), 16) & 32 ? !0 : !1
};
StarWebPrintTrader.prototype.isOffLine = function(a) {
    return parseInt(a.traderStatus.substr(4, 2), 16) & 8 ? !0 : !1
};
StarWebPrintTrader.prototype.isCompulsionSwitchClose = function(a) {
    return parseInt(a.traderStatus.substr(4, 2), 16) & 4 ? !0 : !1
};
StarWebPrintTrader.prototype.isEtbCommandExecute = function(a) {
    return parseInt(a.traderStatus.substr(4, 2), 16) & 2 ? !0 : !1
};
StarWebPrintTrader.prototype.isHighTemperatureStop = function(a) {
    return parseInt(a.traderStatus.substr(6, 2), 16) & 64 ? !0 : !1
};
StarWebPrintTrader.prototype.isNonRecoverableError = function(a) {
    return parseInt(a.traderStatus.substr(6, 2), 16) & 32 ? !0 : !1
};
StarWebPrintTrader.prototype.isAutoCutterError = function(a) {
    return parseInt(a.traderStatus.substr(6, 2), 16) & 8 ? !0 : !1
};
StarWebPrintTrader.prototype.isBlackMarkError = function(a) {
    return parseInt(a.traderStatus.substr(8, 2), 16) & 8 ? !0 : !1
};
StarWebPrintTrader.prototype.isPaperEnd = function(a) {
    return parseInt(a.traderStatus.substr(10, 2), 16) & 8 ? !0 : !1
};
StarWebPrintTrader.prototype.isPaperNearEnd = function(a) {
    return parseInt(a.traderStatus.substr(10, 2), 16) & 4 ? !0 : !1
};
StarWebPrintTrader.prototype.extractionEtbCounter = function(a) {
    var b = 0;
    parseInt(a.traderStatus.substr(14, 2), 16) & 64 && (b |= 16);
    parseInt(a.traderStatus.substr(14, 2), 16) & 32 && (b |= 8);
    parseInt(a.traderStatus.substr(14, 2), 16) & 8 && (b |= 4);
    parseInt(a.traderStatus.substr(14, 2), 16) & 4 && (b |= 2);
    parseInt(a.traderStatus.substr(14, 2), 16) & 2 && (b |= 1);
    return b
};
StarWebPrintTrader.prototype._encodeEscapeSequence = function(a) {
    var b = /[<>&]/g;
    b.test(a) && (a = a.replace(b, function(a) {
        switch (a) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;"
        }
        return "&amp;"
    }));
    return a
};