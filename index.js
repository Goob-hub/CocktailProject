import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;
const url = "https://www.thecocktaildb.com/api/json/v1/1";
const itemsPerPage = 8;

let curPage = 1;
let curSearchResults = [];
let curDrink;
let curFilter;

let staticFileNames = {
    homePage: "index",
    searchResults: "results",
    drinkInfo: "drinkInfo",
    ingredientInfo: "ingredient",
    errorPage: "error"
}

class Ingredient {
    constructor(name, amount){
        this.name = name,
        this.amount = amount
    }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render(`${staticFileNames.homePage}.ejs`, {curWebPage: staticFileNames.homePage});
});

app.post("/searchDrink", async (req, res) => {
    const userSearch = req.body;
    let searchMethod = determineSearchMethod(userSearch);
    curPage = 1;
    try{ 
        const response = await axios.get(`${url}${searchMethod.url}`);
        let drinkData = response.data.drinks;

        if(drinkData == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }

        let formattedDrinkData = reFormatDrinkData(drinkData);

        curSearchResults = formattedDrinkData;
        curFilter = searchMethod.filter;

        res.render(`${staticFileNames.searchResults}.ejs`, {
            drinks: curSearchResults.slice(0, itemsPerPage), 
            curWebPage: staticFileNames.searchResults,
            curPage: curPage
        });
    } catch(error) {
        res.render(`${staticFileNames.errorPage}.ejs`, {
            err: error.message, 
            curWebPage: staticFileNames.errorPage
        });
    }
});

app.post("/nextPage", (req, res) => {
    curPage++;
    let drinksOnPage = getCurPageOfDrinks();

    res.render(`${staticFileNames.searchResults}.ejs`, {
        drinks: drinksOnPage,
        curWebPage: staticFileNames.searchResults,
        curPage: curPage
    });
});

app.post("/prevPage", async (req, res) => {
    curPage--;
    let drinksOnPage = getCurPageOfDrinks();

    res.render(`${staticFileNames.searchResults}.ejs`, {
        drinks: drinksOnPage,
        curWebPage: staticFileNames.searchResults,
        curPage: curPage
    });
});

app.post("/searchIngredient", async (req, res) => {
    const ingredientSearch = req.body.ingredient;
    try{
        const response = await axios.get(`${url}/search.php?i=${ingredientSearch}`);
        const ingredientInfo = response.data.ingredients[0];
        
        if(ingredientInfo == null) {
            throw new Error("Sorry, there are no ingredients that match your search :("); 
        }

        res.render(`${staticFileNames.ingredientInfo}.ejs`, {
            ingredient: ingredientInfo, 
            curWebPage: staticFileNames.ingredientInfo
        });  
    } catch(error) {
        res.render(`${staticFileNames.errorPage}.ejs`, {
            err: error.message, 
            curWebPage: staticFileNames.errorPage
        });
    }
});

app.post("/drinkInfo", async(req, res) => {
    let drinkId = req.body.id;

    if(drinkId == null && curDrink){
        drinkId = curDrink.idDrink;
    }

    try{ 
        const response = await axios.get(`${url}/lookup.php?i=${drinkId}`);
        let drinkData = response.data.drinks;

        if(drinkData == null) {
            throw new Error("Sorry, there was an error trying to get info on that drink :("); 
        }

        let formattedDrinkData = reFormatDrinkData(drinkData); 
        curDrink = formattedDrinkData[0];
        
        res.render(`${staticFileNames.drinkInfo}.ejs`, {
            drink: curDrink, 
            curWebPage: staticFileNames.drinkInfo
        });
    } catch(error) {
        res.render(`${staticFileNames.errorPage}.ejs`, {
            err: error.message, 
            curWebPage: staticFileNames.errorPage
        });
    }
    
});

app.post("/backToDrinks", (req, res) => {
    let drinksOnPage = getCurPageOfDrinks();
    res.render(`${staticFileNames.searchResults}.ejs`, {
        drinks: drinksOnPage, 
        filter: curFilter, 
        curPage: curPage,
        curWebPage: staticFileNames.searchResults
    });
});

app.post("/backHome", (req, res) => {
    res.render(`${staticFileNames.homePage}.ejs`, {curWebPage: staticFileNames.homePage});
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});

function reFormatDrinkData(drinksArr) {
    let formattedDrinks = drinksArr;

    removeNullValues(formattedDrinks);

    formattedDrinks = formatIngredientsInDrinks(formattedDrinks);

    return formattedDrinks;
}

function removeNullValues(objArr) {
    objArr.forEach(obj => {
        //Gets rid of all key's that are equal to null
        Object.keys(obj).forEach(key => {
            if(obj[key] == null) {
                delete obj[key];
            }
        });
    });    
}

function formatIngredientsInDrinks(drinksArr){
    let newDrinkData = [];

    drinksArr.forEach(drink => {
        let ingredientList = createIngredientList(drink);
        drink.ingredients = ingredientList;

        newDrinkData.push(drink);
    });

    return newDrinkData;
}

function createIngredientList(drink) {
    let ingredientList = [];
    let i = 1;

    Object.keys(drink).forEach(key => {
        //Checks if current key is an ingredient
        if(key.includes("strIngredient")){
            let ingredientName = drink[`strIngredient${i}`];
            let ingredientAmount = drink[`strMeasure${i}`];
            let ingredient = new Ingredient(ingredientName, ingredientAmount);
        
            ingredientList.push(ingredient);

            //Deletes old ingredients from drink object
            delete drink[`strIngredient${i}`];
            delete drink[`strMeasure${i}`];

            i++;
        }
    });
    return ingredientList;
}

function determineSearchMethod(data) {
    const drinkName = data.drinkName;
    const ingredientFilter = data.ingredient;
    const alcoholFilter = data.alcohol;
    const getRandomDrink = data.getRandomDrink;
    let searchMethod;

    switch (true) {
        case getRandomDrink !== undefined:
            searchMethod = {url: "/random.php", filter: "random"}
            break;

        case ingredientFilter !== undefined:
            searchMethod = {url: `/filter.php?i=${ingredientFilter}`, filter: "ingredient"}
            break;

        case alcoholFilter !== undefined:
            searchMethod = {url:`/filter.php?a=${alcoholFilter}`, filter: alcoholFilter}
            break;

        case drinkName.length > 1:
            searchMethod = {url: `/search.php?s=${drinkName}`, filter: "name"}
            break;

        default:
            searchMethod = {url: `/search.php?f=${drinkName}`, filter: "name"}
            break;
    }
    return searchMethod;
}

function getCurPageOfDrinks() {
    let totalPages = Math.round(curSearchResults.length / itemsPerPage);
    let startIndex;
    let endIndex;

    switch (true) {
        case totalPages < 1:
            totalPages = 1;
            curPage = 1;
            return curSearchResults.slice(0, itemsPerPage);
            break;
        
        case curPage >= totalPages:
            curPage = totalPages;
            endIndex = curPage * itemsPerPage;
            startIndex = endIndex - itemsPerPage;
            return curSearchResults.slice(startIndex, endIndex);
            break;

        case curPage < 1:
            curPage = 1;
            return curSearchResults.slice(0, itemsPerPage);
            break;
        
        case curPage < totalPages && curPage >= 1:
            endIndex = curPage * itemsPerPage;
            startIndex = endIndex - itemsPerPage;
            return curSearchResults.slice(startIndex, endIndex);
            break;
        default:
            return curSearchResults.slice(0, itemsPerPage);
            break;
    }
}