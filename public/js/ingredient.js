let text = document.querySelector(".description").textContent;
let formattedText = formatText(text);

document.querySelector(".description").innerHTML = formattedText

function formatText(text){
    let splitTxt = text.split("\n");
    let filteredTxt = splitTxt.filter(checkLength);
    return filteredTxt.map(paragraph => `<p class="fs-6">${paragraph}</p></br>`).join("")
}

function checkLength(txt) {
    return txt.length !== 10 && txt.length !== 0 && txt.length !== 8;
}

