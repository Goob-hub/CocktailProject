import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;
const url = "https://www.thecocktaildb.com/api/json/v1/1";

let curDrinkSearchData;
let curDrink;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

function cleanObjects(objArr) {
    objArr.forEach(obj => {
        //Gets rid of all key's that are equal to null
        Object.keys(obj).forEach(key => {
            if(obj[key] == null) {
                delete obj[key];
            }
        });
    });    
}

function formatIngredients(obj) {
    let ingredientsArray = [];
    let i = 1;

    Object.keys(obj).forEach(key => {
        //Checks if current key is an ingredient
        if(key.includes("strIngredient")){
            let ingredientData = {name: "", amount: ""};

            ingredientData.name = obj[`strIngredient${i}`];
            ingredientData.amount = obj[`strMeasure${i}`];

            ingredientsArray.push(ingredientData);

            //Deletes old ingredients from drink object
            delete obj[`strIngredient${i}`];
            delete obj[`strMeasure${i}`];

            i++;
        }
    });
    return ingredientsArray;
}

function formatIngredientData(drinksArr){
    let newDrinksArr = [];

    drinksArr.forEach(drink => {
        let newIngredientData = formatIngredients(drink);
        drink["ingredients"] = newIngredientData;

        newDrinksArr.push(drink);
    });

    return newDrinksArr;
}

function formatData(drinksArr) {
    let formattedDrinks;

    cleanObjects(drinksArr);
    formattedDrinks = formatIngredientData(drinksArr);

    return formattedDrinks;
}

app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.post("/searchDrink", async (req, res) => {
    //Rework with new filters
    const query = req.body.drinkName;
    let searchMethod;
    
    //Checks if user is searching by a full name or single letter
    if(query.length > 1) {
        searchMethod = `/search.php?s=${query}`
    } else {
        searchMethod = `/search.php?f=${query}`
    }

    try{ 
        //Returns an array of drink objects that are poorly formatted
        const response = await axios.get(`${url}${searchMethod}`);
        
        if(response.data.drinks == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }

        //Drink data is now easier to read and use :D!
        const result = formatData(response.data.drinks);
        
        curDrinkSearchData = result;
        
        res.render("results.ejs", {drinks: result});
    } catch(error) {
        res.render("error.ejs", {err: error.message});
    }
});

app.post("/searchIngredient", async (req, res) => {
    const query = req.body.ingredient;
    try{
        //Returns the entire lore of a specific ingredient 
        const response = await axios.get(`${url}/search.php?i=${query}`);
        const result = response.data.ingredients;
        
        if(result == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }
        console.log(result)
        res.render("ingredient.ejs", {ingredients: result});  
    } catch(error) {
        res.render("error.ejs", {err: error.message});
    }
});

app.post("/random", async (req, res) => {
    try{
        //Returns an array of drink objects that are poorly formatted 
        const response = await axios.get(`${url}/random.php`);
        
        if(response.data.drinks == null) {
            throw new Error("Sorry, there are no results that match your search :("); 
        }
        
        //Drink data is now easier to read and use :D!
        const result = formatData(response.data.drinks);
        
        curDrinkSearchData = result;
        
        res.render("results.ejs", {drinks: result});
    } catch(error) {
        res.render("error.ejs", {err: error.message});
    }
});

app.post("/drinkInfo", (req, res) => {
    let drinkId = req.body.id;

    if(drinkId == null && curDrink == null){
        throw new Error("Error 404 :(")
    }
    curDrinkSearchData.forEach(drink => {
        if(drink.idDrink === drinkId){ curDrink = drink; return;}
    });
    res.render("drinkInfo.ejs", {drink: curDrink});
    
});

app.post("/backToDrinks", (req, res) => {
    res.render("results.ejs", {drinks: curDrinkSearchData})
});

app.post("/backHome", (req, res) => {
    res.render("index.ejs");
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});