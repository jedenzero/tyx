let languages;
let lang;
let dictionary;
let processed;
let search;
const part_of_words = ['명사'];
const view = document.getElementById('view');
const search_input = document.getElementById('search');
const result = document.getElementById('result');

function setUI(){
    const buttons = ['information', 'sort',
        'filter', 'statistics', 'word-chain',
        'anagram', 'wordle', 'fazan', 'hangman'
    ];

    for(let i of buttons){
        const functionName = i.replaceAll('-', '_');
        document.getElementById(i).addEventListener('click', () => {
            window[functionName]();
        });
    }
    
    search_input.addEventListener('click', () => {
        search(search_input.value);
    });
}

async function setAssets(){
    const response1 = await fetch('https://docs.google.com/spreadsheets/d/1ABeYLqNSbcUduAzQKk8r0nJf6hdLMUhwuyMOsDZONKY/export?format=csv&gid=0');
    const text1 = await response1.text();
    languages = Papa.parse(text1, {
        header: true,
        skipEmptyLines: true
    }).data;
    let query = new URL(window.location.href).searchParams.get('lang');
    
    if(query == null){
        search = search_language;
    }
    else{
        lang = languages.find(el => el['코드'] == query);
        const id = lang['아이디'];
        const sheet = lang['시트'];
        const response2 = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${sheet}`);
        const text2 = await response2.text();
        dictionary = Papa.parse(text2, {
            header: true,
            skipEmptyLines: true
        }).data;
        processed = [...dictionary];
        const tags = Object.keys(dictionary[0]);

        if(tags.includes('뜻')){
            search = search_ver;
        }
        else{
            search = search_hor;
        }
    }
}

function search_language(target){
    reset();
    if(target == ''){
        return;
    }
    
    const result_start = processed.filter(row => row['언어명'].startsWith(target));
    const result_include = processed.filter(row => row['언어명'].includes(target));
    const result_arr = merge([result_start, result_include]);
    
    result_arr.forEach(row => {
        add(`<div class="header"><a href="?lang=${row['코드']}">${row['언어명']}</a></div>`);
        add(`<div><em>코드</em>: ${row['코드']}</div>`);
        row['설명'] && add(`<div>${row['설명']}</div>`);
    });
}

function search_ver(target){
    reset();
    if(target == ''){
        return;
    }
}

function search_hor(target){
    reset();
    if(target == ''){
        return;
    }
}

function reset(){
    result.innerHTML = '';
}

function add(html){
    result.insertAdjacentHTML('beforeend', html);
}

function information(){
    
}

function merge(elements){
    let merged = elements.reduce((acc, arr) => {
        acc.push(...arr);
        return acc;
    }, []);
    let set = new Set();
    merged = merged.filter(item => {
        const string = JSON.stringify(item);
        
        if(set.has(string)){
            return false;
        }
        else{
            set.add(string);
            return true;
        }
    });
    
    return merged;
}

setUI();
setAssets();