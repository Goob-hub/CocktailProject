import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;
const url = "https://www.thecocktaildb.com/api/json/v1/1";

let curDrinkSearchResults;
let curDrink;
let curFilter;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

class Ingredient {
    constructor(name, amount){
        this.name = name,
        this.amount = amount
    }
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

function formatIngredientData(drinksArr){
    let formattedDrinks = [];

    drinksArr.forEach(drink => {
        let ingredientList = createIngredientList(drink);
        drink["ingredients"] = ingredientList;
        formattedDrinks.push(drink);
    });

    return formattedDrinks;
}

function formatDrinks(drinksArr) {
    let formattedDrinks;

    removeNullValues(drinksArr);

    formattedDrinks = formatIngredientData(drinksArr);

    return formattedDrinks;
}

function determineSearchMethod(data) {
    const drinkName = data.drinkName;
    const ingredientFilter = data.ingredient;
    const alcoholFilter = data.alcohol;
    const getRandomDrink = data.getRandomDrink;

    if(getRandomDrink){
        return {url: "/random.php", filter: "random"}
    }

    if(ingredientFilter) {
        return {url: `/filter.php?i=${ingredientFilter}`, filter: "ingredient"}
    }

    if(alcoholFilter) {
        return {url:`/filter.php?a=${alcoholFilter}`, filter: alcoholFilter}
    }

    if(drinkName.length > 1){
        return {url: `/search.php?s=${drinkName}`, filter: "name"}
    } else{
        return {url: `/search.php?f=${drinkName}`, filter: "name"}
    }
}

app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.post("/searchDrink", async (req, res) => {
    //Rework with new filters
    const data = req.body;
    let searchMethod = determineSearchMethod(data);
    try{ 
        //Returns an array of drink objects that are poorly formatted
        const response = await axios.get(`${url}${searchMethod.url}`);
        let result = response.data.drinks;

        if(result == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }
        //Drink data is now easier to read and use :D!
        let formattedDrinkData = formatDrinks(result);
        curDrinkSearchResults = formattedDrinkData;
        curFilter = searchMethod.filter;
        
        res.render("results.ejs", {drinks: curDrinkSearchResults, filter: curFilter});
    } catch(error) {
        res.render("error.ejs", {err: error.message});
    }
});

app.post("/searchIngredient", async (req, res) => {
    const ingredient = req.body.ingredient;
    try{
        //Returns the entire lore of a specific ingredient 
        const response = await axios.get(`${url}/search.php?i=${ingredient}`);
        const result = response.data.ingredients;
        
        if(result == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }

        res.render("ingredient.ejs", {ingredients: result});  
    } catch(error) {
        res.render("error.ejs", {err: error.message});
    }
});

app.post("/drinkInfo", async(req, res) => {
    let drinkId = req.body.id;

    if(drinkId == null && curDrink){
        drinkId = curDrink.idDrink;
    }

    try{ 
        //Returns an array of drink objects that are poorly formatted
        const response = await axios.get(`${url}/lookup.php?i=${drinkId}`);
        let result = response.data.drinks;

        if(result == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }

        //Drink data is now easier to read and use :D!
        let formattedDrinkData = formatDrinks(result); 
        curDrink = formattedDrinkData[0];
        
        res.render("drinkInfo.ejs", {drink: curDrink});
    } catch(error) {
        res.render("error.ejs", {err: error.message});
    }
    
});

app.post("/backToDrinks", (req, res) => {
    res.render("results.ejs", {drinks: curDrinkSearchResults, filter: curFilter});
});

app.post("/backHome", (req, res) => {
    res.render("index.ejs");
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});