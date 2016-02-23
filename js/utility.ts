"use strict";
function getContextFromHTTP(url: string, fn) {
    getFromHTTP(url, fn, "document");
}
function getTextFromHTTP(url: string, fn) {
    getFromHTTP(url, fn, "text");
}
function getFromHTTP(url: string, fn, str: string) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
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
function changeTXT(elm: HTMLElement, str: string): HTMLElement {
    elm.innerHTML = str;
    return elm;
}
function changeSRC(elm: HTMLImageElement, str: string): HTMLElement {
    elm.src = str;
    return elm;
}
function changeURL(elm: HTMLAnchorElement, str: string): HTMLElement {
    elm.href = str;
    return elm;
}
function changeID(elm: HTMLElement, str: string): HTMLElement {
    elm.id = str;
    return elm;
}
function applyDOM(dom: HTMLElement, a): HTMLElement {
    if (dom.querySelector(a.selector)) {
        let elms = dom.querySelectorAll(a.selector);
        Array.prototype.map.call(elms, (elm) => {
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
function applyPerson(dom: HTMLElement, obj): HTMLElement {
    if (typeof obj[`image`] === "undefined") {
        obj[`image`] = ``;
    }
    if (obj[`@type`] === `Person`) {
        [
            { selector: ".person", after: obj[`@id`], fn: changeID },
            { selector: ".rpPersonName", after: getAuthorName(obj[`name`]), fn: changeTXT },
            { selector: ".rpPersonImage", after: obj[`image`], fn: changeSRC },
            { selector: ".rpPersonURL", after: obj[`url`], fn: changeURL }
        ].map((a) => {
            return applyDOM(dom, a);
        });
    }
    //addDOM(dom);
    return dom;
}
function applyReview(dom: HTMLElement, obj, fn): HTMLElement {
    if (obj[`@type`] === `Review`) {
        if (typeof obj[`author`][`url`] !== "undefined") {
            getContextFromHTTP(obj[`author`][`url`], (subdom) => {
                getJSONLDs(subdom).map((obj) => {
                    fn(dom, obj);
                });
                return dom;
            });
        }
        [
            { selector: ".rpItemReviewedName", after: obj[`itemReviewed`][`name`], fn: changeTXT },
            { selector: ".rpReviewRatingRatingValue", after: obj[`reviewRating`][`ratingValue`], fn: changeTXT },
            { selector: ".rpPersonName", after: getAuthorName(obj[`author`]), fn: changeTXT },
            { selector: ".rpReviewName", after: obj[`name`], fn: changeTXT },
            { selector: ".rpReviewBody", after: obj[`reviewBody`], fn: changeTXT },
            { selector: ".rpReviewURL", after: obj[`url`], fn: changeURL },
            { selector: ".rpPersonImage", after: obj[`author`][`image`], fn: changeSRC },
            { selector: ".rpPersonURL", after: obj[`author`][`url`], fn: changeURL }
        ].forEach((a) => { return applyDOM(dom, a); });
    }
    return dom;
}

function initReview(dom, obj) {
    applyReview(dom, obj, (dom, obj) => {
        applyPerson(dom, obj);
        addDOM(dom);
    });
}
function getJSONLDs(dom: any) {
    let vals = dom.querySelectorAll('script[type="application/ld+json"]');
    return Array.prototype.map.call(vals, (val) => {
        return JSON.parse(val.innerHTML);
    });
}
function getHTMLTemplates(dom: HTMLElement): HTMLElement[] {
    let vals = dom.querySelectorAll('template');
    return Array.prototype.map.call(vals, (val) => {
        return val.content;
    });
}
function applyJSONLD(doms: HTMLElement[], objs, fn): any[] {
    return Array.prototype.map.call(doms, (dom) => {
        return Array.prototype.map.call(objs, (obj) => {
            return fn(dom, obj);
        });
    });
}
function applyHTMLTemplates(dom: HTMLElement) {
    let vals = dom.querySelectorAll('template');
    Array.prototype.map.call(vals, (val) => {
        document.body.appendChild(document.importNode(val.content, true));
    });
}
function addDOM(dom: HTMLElement) {
    document.body.appendChild(document.importNode(dom, true));
}
function addDOM2(dom: HTMLElement, selector: string) {
    document.querySelector(selector).appendChild(document.importNode(dom, true));
}
function initModule(tmpl: string, urls: string, fn) {
    document.addEventListener("DOMContentLoaded", (event) => {
        getContextFromHTTP(tmpl, (dom) => {
            getTextFromHTTP(urls, (text) => {
                text.split(/\r\n|\r|\n/).filter((item) => {
                    if (item !== '') return true;
                }).map((url) => {
                    let templdom = dom.cloneNode(true);
                    getContextFromHTTP(url, (jsonlddom) => {
                        applyJSONLD(getHTMLTemplates(templdom), getJSONLDs(jsonlddom), fn);
                    });
                });
            });
        });
    });
}
function initModuleFromSelf(tmpl: string, fn) {
    document.addEventListener("DOMContentLoaded", (event) => {
        getContextFromHTTP(tmpl, (dom) => {
            let templdom = dom.cloneNode(true);
            applyJSONLD(getHTMLTemplates(templdom), getJSONLDs(document), fn);
        });
    });
}
function initQuestion(dom, obj) {
    applyQuestion(dom, obj, (dom, obj) => {
        addDOM(dom);
    });
}
function applyPersonObj(obj, subobj) {
    if (subobj["@type"] === "Person") {
        if (typeof subobj["image"] !== "undefined") {
            if (subobj["url"] === obj["author"]["url"]) {
                obj[`author`]["image"] = subobj["image"];
            }
            if (subobj["url"] === obj["acceptedAnswer"]["author"]["url"]) {
                obj["acceptedAnswer"]["author"]["image"] = subobj["image"];
            }
        }
    }
    return obj;
}
function loopA(obj, str: string, fn, fn2) {
    if (typeof str !== "undefined") {
        getContextFromHTTP(str, (subdom) => {
            getJSONLDs(subdom).map((subobj) => {
                fn(obj, subobj);
                fn2(obj);
            });
        });
    } else {
        fn2(obj);
    }
}
function applyQuestion(dom: HTMLElement, obj, fn) {
    if (obj["@type"] === "Question") {
        if (typeof obj["author"]["image"] === "undefined") {
            obj["author"]["image"] = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_person_black_48px.svg";
        }
        if (typeof obj["acceptedAnswer"]["author"]["image"] === "undefined") {
            obj["acceptedAnswer"]["author"]["image"] = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_person_black_48px.svg";
        }
        loopA(obj, obj["author"]["url"], applyPersonObj, (obj) => {
            loopA(obj, obj["acceptedAnswer"]["author"]["url"], applyPersonObj, (obj) => {
                [
                    { selector: ".rpQuestionText", after: obj["text"], fn: changeTXT },
                    { selector: ".rpAnswerText", after: obj["acceptedAnswer"]["text"], fn: changeTXT },
                    { selector: ".rpQuestionPersonName", after: getAuthorName(obj["author"]), fn: changeTXT },
                    { selector: ".rpAnswerPersonName", after: getAuthorName(obj["acceptedAnswer"]["author"]), fn: changeTXT },
                    { selector: ".rpQuestionPersonImage", after: obj["author"]["image"], fn: changeSRC },
                    { selector: ".rpAnswerPersonImage", after: obj["acceptedAnswer"]["author"]["image"], fn: changeSRC }
                ].map((a) => {
                    return applyDOM(dom, a);
                });
                if (typeof obj[`author`][`url`] === "undefined") {
                    fn(dom, obj);
                }
            });
        });
    }
}
