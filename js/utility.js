"use strict";
function getContextFromHTTP(url, fn) {
    getFromHTTP(url, fn, "document");
}
function getTextFromHTTP(url, fn) {
    getFromHTTP(url, fn, "text");
}
function getFromHTTP(url, fn, str) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            if (str === "document") {
                return fn(xhr.responseXML);
            }
            if (str === "text") {
                return fn(xhr.responseText);
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.responseType = str;
    xhr.send();
}
function changeTXT(elm, str) {
    elm.innerHTML = str;
    return elm;
}
function changeSRC(elm, str) {
    elm.src = str;
    return elm;
}
function changeURL(elm, str) {
    elm.href = str;
    return elm;
}
function changeID(elm, str) {
    elm.id = str;
    return elm;
}
function applyDOM(dom, a) {
    if (dom.querySelector(a.selector)) {
        var elms = dom.querySelectorAll(a.selector);
        Array.prototype.map.call(elms, function (elm) {
            if (typeof a.after !== "undefined") {
                return a.fn(elm, a.after);
            }
        });
    }
    return dom;
}
function getAuthorName(val) {
    return (typeof val === 'object') ? val['name'] : val;
}
function applyPerson(dom, obj) {
    if (typeof obj["image"] === "undefined") {
        obj["image"] = "";
    }
    if (obj["@type"] === "Person") {
        [
            { selector: ".person", after: obj["@id"], fn: changeID },
            { selector: ".rpPersonName", after: getAuthorName(obj["name"]), fn: changeTXT },
            { selector: ".rpPersonImage", after: obj["image"], fn: changeSRC },
            { selector: ".rpPersonURL", after: obj["url"], fn: changeURL }
        ].map(function (a) {
            return applyDOM(dom, a);
        });
    }
    return dom;
}
function applyReview(dom, obj, fn) {
    if (obj["@type"] === "Review") {
        if (typeof obj["author"]["url"] !== "undefined") {
            getContextFromHTTP(obj["author"]["url"], function (subdom) {
                getJSONLDs(subdom).map(function (obj) {
                    fn(dom, obj);
                });
                return dom;
            });
        }
        [
            { selector: ".rpItemReviewedName", after: obj["itemReviewed"]["name"], fn: changeTXT },
            { selector: ".rpReviewRatingRatingValue", after: obj["reviewRating"]["ratingValue"], fn: changeTXT },
            { selector: ".rpPersonName", after: getAuthorName(obj["author"]), fn: changeTXT },
            { selector: ".rpReviewName", after: obj["name"], fn: changeTXT },
            { selector: ".rpReviewBody", after: obj["reviewBody"], fn: changeTXT },
            { selector: ".rpReviewURL", after: obj["url"], fn: changeURL },
            { selector: ".rpPersonImage", after: obj["author"]["image"], fn: changeSRC },
            { selector: ".rpPersonURL", after: obj["author"]["url"], fn: changeURL }
        ].forEach(function (a) { return applyDOM(dom, a); });
    }
    return dom;
}
function initReview(dom, obj) {
    applyReview(dom, obj, function (dom, obj) {
        applyPerson(dom, obj);
        addDOM(dom);
    });
}
function getJSONLDs(dom) {
    var vals = dom.querySelectorAll('script[type="application/ld+json"]');
    return Array.prototype.map.call(vals, function (val) {
        return JSON.parse(val.innerHTML);
    });
}
function getHTMLTemplates(dom) {
    var vals = dom.querySelectorAll('template');
    return Array.prototype.map.call(vals, function (val) {
        return val.content;
    });
}
function applyJSONLD(doms, objs, fn) {
    return Array.prototype.map.call(doms, function (dom) {
        return Array.prototype.map.call(objs, function (obj) {
            return fn(dom, obj);
        });
    });
}
function applyHTMLTemplates(dom) {
    var vals = dom.querySelectorAll('template');
    Array.prototype.map.call(vals, function (val) {
        document.body.appendChild(document.importNode(val.content, true));
    });
}
function addDOM(dom) {
    document.body.appendChild(document.importNode(dom, true));
}
function addDOM2(dom, selector) {
    document.querySelector(selector).appendChild(document.importNode(dom, true));
}
function initModule(tmpl, urls, fn) {
    document.addEventListener("DOMContentLoaded", function (event) {
        getContextFromHTTP(tmpl, function (dom) {
            getTextFromHTTP(urls, function (text) {
                text.split(/\r\n|\r|\n/).filter(function (item) {
                    if (item !== '')
                        return true;
                }).map(function (url) {
                    var templdom = dom.cloneNode(true);
                    getContextFromHTTP(url, function (jsonlddom) {
                        applyJSONLD(getHTMLTemplates(templdom), getJSONLDs(jsonlddom), fn);
                    });
                });
            });
        });
    });
}
function initModuleFromSelf(tmpl, fn) {
    document.addEventListener("DOMContentLoaded", function (event) {
        getContextFromHTTP(tmpl, function (dom) {
            var templdom = dom.cloneNode(true);
            applyJSONLD(getHTMLTemplates(templdom), getJSONLDs(document), fn);
        });
    });
}
function initQuestion(dom, obj) {
    applyQuestion(dom, obj, function (dom, obj) {
        addDOM(dom);
    });
}
function applyPersonObj(obj, subobj) {
    if (subobj["@type"] === "Person") {
        if (typeof subobj["image"] !== "undefined") {
            if (subobj["url"] === obj["author"]["url"]) {
                obj["author"]["image"] = subobj["image"];
            }
            if (subobj["url"] === obj["acceptedAnswer"]["author"]["url"]) {
                obj["acceptedAnswer"]["author"]["image"] = subobj["image"];
            }
        }
    }
    return obj;
}
function loopA(obj, str, fn, fn2) {
    if (typeof str !== "undefined") {
        getContextFromHTTP(str, function (subdom) {
            getJSONLDs(subdom).map(function (subobj) {
                fn(obj, subobj);
                fn2(obj);
            });
        });
    }
    else {
        fn2(obj);
    }
}
function applyQuestion(dom, obj, fn) {
    if (obj["@type"] === "Question") {
        if (typeof obj["author"]["image"] === "undefined") {
            obj["author"]["image"] = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_person_black_48px.svg";
        }
        if (typeof obj["acceptedAnswer"]["author"]["image"] === "undefined") {
            obj["acceptedAnswer"]["author"]["image"] = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_person_black_48px.svg";
        }
        loopA(obj, obj["author"]["url"], applyPersonObj, function (obj) {
            loopA(obj, obj["acceptedAnswer"]["author"]["url"], applyPersonObj, function (obj) {
                [
                    { selector: ".rpQuestionText", after: obj["text"], fn: changeTXT },
                    { selector: ".rpAnswerText", after: obj["acceptedAnswer"]["text"], fn: changeTXT },
                    { selector: ".rpQuestionPersonName", after: getAuthorName(obj["author"]), fn: changeTXT },
                    { selector: ".rpAnswerPersonName", after: getAuthorName(obj["acceptedAnswer"]["author"]), fn: changeTXT },
                    { selector: ".rpQuestionPersonImage", after: obj["author"]["image"], fn: changeSRC },
                    { selector: ".rpAnswerPersonImage", after: obj["acceptedAnswer"]["author"]["image"], fn: changeSRC }
                ].map(function (a) {
                    return applyDOM(dom, a);
                });
                if (typeof obj["author"]["url"] === "undefined") {
                    fn(dom, obj);
                }
            });
        });
    }
}
