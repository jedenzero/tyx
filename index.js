let languages;
let lang;
let dictionary;
let processed;
let search;
let tags;
const reserved_tags = ['단어', '어원', '뜻', '품사', '설명', '비고', '분류'];
const all_pos = ['명사', '대명사', '의존명사', '분류사', '수분류사', '고유명사', '유정명사', '무정명사', '수사',
    '동사', '조동사', '계사', '경동사', '자동사', '타동사', '형용동사', '서술사',
    '한정사', '관사', '형용사', '관형사', '부사', '전치사', '후치사',
    '조사', '어두', '어미', '접속사', '감탄사', '의문사', '소사', '허사',
    '접두사', '접미사', '접요사', '접환사', '삽간사', '관통접사', '기타', '불명'];
let pos;
const view = document.getElementById('view');
const search_input = document.getElementById('search');
const result = document.getElementById('result');

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
        tags = Object.keys(dictionary[0]);

        if(tags.includes('뜻')){
            search = search_ver;
        }
        else{
            search = search_hor;
            pos = tags.filter(el => all_pos.includes(el));
        }
    }
}

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
    const result_word_start = processed.filter(row => row['단어'].startsWith(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_word_include = processed.filter(row => row['단어'].includes(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_meaning_equal = processed.filter(row => cleanse(row['뜻']).split(/,|;/).includes(target));
    const result_meaning_start = processed.filter(row => cleanse(row['뜻']).split(/,|;/).some(meaning => meaning.startsWith(target)));
    const result_meaning_include = processed.filter(row => cleanse(row['뜻']).split(/,|;/).some(meaning => meaning.includes(target)));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_equal, result_meaning_start, result_meaning_include]);
    
    result_arr.forEach(row => {
        add(`<div class="head">${row['단어']}</div>`);
        add(`<div><em>${row['품사']}</em></div>`);
        addMeanings(row['뜻']);

        (row['설명'] || row['비고']) && add(`<div class="information">${row['설명'] || row['비고']}</div>`);
        tags.forEach(el => {
            if(!reserved_tags.includes(el) && row[el]){
                add(`<div><em>${el}</em> ${row[el]}</div>`);
            }
        });
    });
}

// search_hor: 수평형 시트, 즉 다품사 어휘가 품사에 따라 같은 행의 다른 열에 나뉘는 방식
function search_hor(target){
    reset();
    if(target == ''){
        return;
    }
    const result_word_start = processed.filter(row => row['단어'].startsWith(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_word_include = processed.filter(row => row['단어'].includes(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_meaning_equal = processed.filter(row => pos.some(tag => cleanse(row[tag]).split(/,|;/).includes(target)));
    const result_meaning_start = processed.filter(row => pos.some(tag => cleanse(row[tag]).split(/,|;/).some(el => el.startsWith(target))));
    const result_meaning_include = processed.filter(row => pos.some(tag => cleanse(row[tag]).split(/,|;/).some(el => el.includes(target))));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_equal, result_meaning_start, result_meaning_include]);
    
    result_arr.forEach(row => {
        add(`<div class="head">${row['단어']}</div>`);
        pos.forEach(el => {
            if(row[el]){
                addMeanings(row[el]);
            }
        });
        (row['설명'] || row['비고']) && add(`<div class="information">${row['설명'] || row['비고']}</div>`);
        tags.forEach(el => {
            if(!reserved_tags.includes(el) && row[el]){
                add(`<div><em>${el}</em> ${row[el]}</div>`);
            }
        });
    });
}

function information(){
    
}

function reset(){
    result.innerHTML = '';
}

function add(html){
    result.insertAdjacentHTML('beforeend', html);
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

function addMeanings(string){
    const meanings = string.split(';');
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
}

setAssets().then(() => {
    setUI();
});