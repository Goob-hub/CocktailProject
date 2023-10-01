import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;
const url = "https://www.thecocktaildb.com/api/json/v1/1";

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

app.post("/random", async (req, res) => {
    try{
        //Returns an array of drink objects that are poorly formatted 
        const response = await axios.get(`${url}/random.php`);
        
        //Drink data is now easier to read and use :D!
        const result = formatData(response.data.drinks);
        
        res.render("index.ejs", {drinks: result});
    } catch(error) {
        res.render("index.ejs", {recipe: error.message});
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
})