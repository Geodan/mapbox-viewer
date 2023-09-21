
/* 
    result.docs[{
        "type": "weg",
        "weergavenaam": "Kerkweg, Aadorp",
        "id": "weg-1e82c49d09a4a85de775644fb8c4397c",
        "score": 15.51
    }],
    highlighting: {
        "weg-1e82c49d09a4a85de775644fb8c4397c": {
            "suggest": ["<b>Kerkweg</b>, Aadorp"]
        }
    }
*/
async function getSuggestions(str) {
    const response = await fetch('https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?wt=json&q=' + encodeURI(str));
    if (response.ok) {
        const result = await response.json();
        return result; 
    }
}



async function lookUp(id) {
    const response = await fetch('https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?wt=json&id=' + encodeURI(id));
    if (response.ok) {
        const result = await response.json();
        return result; 
    }
}