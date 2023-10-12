let text = document.querySelector(".description").textContent;
let formattedText = formatText(text);

document.querySelector(".description").innerHTML = formattedText

function formatText(text){
    return text.split('\n').map(paragraph => `<p class="fs-5" style="text-align: left">${paragraph}</p>`).join("")
}

