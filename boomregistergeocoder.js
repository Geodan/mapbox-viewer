async function zoomTo(docId) {
    if (map) {
        const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?wt=json&id=${encodeURI(docId)}`;
        const response = await fetch(url);
        if (response.ok) {
            const result = await response.json();
            const lonlat = result.response.docs[0].centroide_ll.slice(6,-1).split(' ').map(s=>parseFloat(s));
            map.flyTo({center: lonlat})
        }
    }
}

let lastTimeout;

function updateGeocoderList(event) {
    clearTimeout(lastTimeout);
    lastTimeout = setTimeout(async()=>{
        const url = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?wt=json&q=";
        let list = document.querySelector('#geocoderlist');
        let search = (event.target).value;
        if (search.length > 2) {
            let response = await fetch(url+encodeURI(search));
            if (response.ok) {
                let result = await response.json()
                list.innerHTML = `<ul>${result.response.docs.map(doc=>`<li onclick="zoomTo('${doc.id}')">${result.highlighting[doc.id].suggest[0]}</li>`).join('\n')}</ul>`
            }
        } else {
            list.innerHTML = '';
        }
    }, 500);
}

function initGeocoder() {
    let searchInput = document.querySelector('#geocoder input');
    searchInput.addEventListener('input', (event)=>updateGeocoderList(event));
}

initGeocoder();