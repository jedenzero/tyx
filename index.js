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
    
    search_input.addEventListener('input', () => {
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
    
    const result_start = languages.filter(row => row['언어명'].startsWith(target));
    const result_include = languages.filter(row => row['언어명'].includes(target));
    const result_arr = merge([result_start, result_include]);
    
    result_arr.forEach(row => {
        add(`<div class="head"><a href="?lang=${row['코드']}">${row['언어명']}</a></div>`);
        add(`<div><em>코드</em>: ${row['코드']}</div>`);
        row['설명'] && add(`<div>${row['설명']}</div>`);
    });
}

// search_ver: 수직형 시트, 즉 다품사 어휘가 품사에 따라 다른 행에 나뉘는 방식
function search_ver(target){
    reset();
    if(target == ''){
        return;
    }
    const result_word_start = processed.filter(row => row['단어'].startsWith(target));
    const result_word_include = processed.filter(row => row['단어'].includes(target));
    const result_meaning_start = processed.filter(row => cleanse(row['뜻']).startsWith(target));
    const result_meaning_include = processed.filter(row => cleanse(row['뜻']).includes(target));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_start, result_meaning_include]);
    
    result_arr.forEach(row => {
        const meanings = row['뜻'].split(';');
        
        add(`<div class="head">${row['단어']}</div>`);
        add(`<div><em>${row['품사']}</em></div>`);
        if(meanings.length == 1){
            const el = meanings[0];
            
            add(`<div>${cleanse(el)}</div>`)
            if(el.includes(' ¶')){
                const examples = el.split(' ¶').slice(1);
                examples.forEach(ex => {
                    add(`<div class="example">${ex.split('  ')[0]}<br>${ex.split('  ')[1]}</div>`);
                });
            }
        }
        else{
            meanings.forEach((el, index) => {
                add(`<div>${index+1}. ${cleanse(el)}</div>`);
                if(el.includes(' ¶')){
                    const examples = el.split(' ¶').slice(1);
                    examples.forEach(ex => {
                        add(`<div class="example">${ex.split('  ')[0]}<br>${ex.split('  ')[1]}</div>`);
                    });
                }
            });
        }
        add(`<div></div>`);
    });
}

// search_hor: 수평형 시트, 즉 다품사 어휘가 품사에 따라 같은 행의 다른 열에 나뉘는 방식
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

function cleanse(string){
    return string.replace(/ ¶[^;]*(;|$)/g, '$1');
}

setUI();
setAssets();