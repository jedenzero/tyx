let languages;
let lang;
let dictionary;
let dictionary_type;
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
const close_view = '<div class="button" style="margin-top: 50px;" onclick="closeView()">[닫기]</div>';

async function setAssets(){
    const response1 = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQWe2vHDfJZ6hiMH77Jlzl4lvdWjiPxtHi82mKNBfketCHSTfG4ClZf6crrXDQGfEcqa76su7SspZxY/pub?output=csv');
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
        const response2 = await fetch(`https://docs.google.com/spreadsheets/d/e/${id}/pub?gid=${sheet}&output=csv`);
        const text2 = await response2.text();
        dictionary = Papa.parse(text2, {
            header: true,
            skipEmptyLines: true
        }).data;
        processed = [...dictionary];
        tags = Object.keys(dictionary[0]);

        if(tags.includes('뜻')){
            search = search_ver;
            dictionary_type = 'ver';
        }
        else{
            search = search_hor;
            pos = tags.filter(el => all_pos.includes(el));
            dictionary_type = 'hor';
        }
    }
}

function setUI(){
    const buttons = ['information', 'filter',
        'sort', 'statistics', 'word-chain',
        'anagram', 'wordle', 'fazan', 'hangman'
    ];

    for(let i of buttons){
        const functionName = i.replace(/-/g, '_');
        document.getElementById(i).addEventListener('click', () => {
            view.innerHTML = '';
            search_input.style.display = 'none';
            result.style.display='none';
            window[functionName]();
            addView(close_view);
        });
    }
    
    search_input.addEventListener('input', () => {
        search(search_input.value);
    });
}

function search_language(target){
    resetResult();
    
    const result_start = languages.filter(row => row['언어명'].startsWith(target));
    const result_include = languages.filter(row => row['언어명'].includes(target));
    const result_arr = merge([result_start, result_include]);
    
    result_arr.forEach(row => {
        addResult(`<div class="head"><a href="?lang=${row['코드']}">${row['언어명']}</a></div>`);
        addResult(`<div><span class="tag_em">코드</span>: ${row['코드']}</div>`);
        row['설명'] && addResult(`<div class="information">${row['설명']}</div>`);
    });
}

// search_ver: 수직형 시트, 즉 다품사 어휘가 품사에 따라 다른 행에 나뉘는 방식
function search_ver(target){
    resetResult();
    if(target == ''){
        return;
    }
    const result_word_start = processed.filter(row => row['단어'].startsWith(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_word_include = processed.filter(row => row['단어'].includes(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_meaning_equal = processed.filter(row => removeExamples(row['뜻']).split(/,\s|;\s/).some(meaning => meaning == target || removeParens(meaning) == target));
    const result_meaning_start = processed.filter(row => removeExamples(row['뜻']).split(/,\s|;\s/).some(meaning => meaning.startsWith(target) || removeParens(meaning).startsWith(target)));
    const result_meaning_include = processed.filter(row => removeExamples(row['뜻']).split(/,\s|;\s/).some(meaning => meaning.includes(target)));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_equal, result_meaning_start, result_meaning_include]);
    
    result_arr.slice(0, 100).forEach(row => {
        addResult(`<div class="head">${row['단어']}</div>`);
        row['어원'] && addResult(`<div class="etymology">${row['어원']}</div>`);
        addResult(`<div class="tag_em">${row['품사']}</div>`);
        addMeanings(row['뜻']);

        (row['설명'] || row['비고']) && addResult(`<div class="information">${row['설명'] || row['비고']}</div>`);
        tags.forEach(el => {
            if(!reserved_tags.includes(el) && row[el]){
                addResult(`<div><span class="tag">${el}</span><span> ${row[el]}</span></div>`);
            }
        });
    });
}

// search_hor: 수평형 시트, 즉 다품사 어휘가 품사에 따라 같은 행의 다른 열에 나뉘는 방식
function search_hor(target){
    resetResult();
    if(target == ''){
        return;
    }
    const result_word_start = processed.filter(row => row['단어'].startsWith(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_word_include = processed.filter(row => row['단어'].includes(target)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_meaning_equal = processed.filter(row => pos.some(tag => removeExamples(row[tag]).split(/,\s|;\s/).some(el => el == target || removeParens(el) == target)));
    const result_meaning_start = processed.filter(row => pos.some(tag => removeExamples(row[tag]).split(/,\s|;\s/).some(el => el.startsWith(target) || removeParens(el).startsWith(target))));
    const result_meaning_include = processed.filter(row => pos.some(tag => removeExamples(row[tag]).split(/,\s|;\s/).some(el => el.includes(target))));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_equal, result_meaning_start, result_meaning_include]);
    
    result_arr.slice(0, 100).forEach(row => {
        addResult(`<div class="head">${row['단어']}</div>`);
        row['어원'] && addResult(`<div class="etymology">${row['어원']}</div>`);
        pos.forEach(el => {
            if(row[el]){
                addResult(`<div><span class="tag_em">${el}</span></div>`);
                addMeanings(row[el]);
            }
        });
        (row['설명'] || row['비고']) && addResult(`<div class="information">${row['설명'] || row['비고']}</div>`);
        tags.forEach(el => {
            if(!reserved_tags.includes(el) && !all_pos.includes(el) && row[el]){
                addResult(`<div><span class="tag">${el}</span> ${row[el]}</div>`);
            }
        });
    });
}

function information(){
    let example_amount = 0;
    
    addView(`<div class="head">${lang['언어명']}</div>`);
    lang['설명'] && addView(`<div class="information">${lang['설명']}</div>`);
    addView(`<div><span class="tag" style="margin-top: 10px;">코드</span><span> ${lang['코드']}</span></div>`);
    lang['집필자'] && addView(`<div><span class="tag">집필자</span><span> ${lang['집필자']}</span></div>`);
    addView(`<div><span class="tag">표제어 수</span><span> ${dictionary.length}개</span></div>`);
    if(dictionary_type == 'ver'){
        dictionary.forEach(row => {
            example_amount += row['뜻'].split('¶').length - 1;
        });
        addView(`<div><span class="tag">예문 수</span><span> ${example_amount}개</span></div>`);
    }
    if(dictionary_type = 'hor'){
        dictionary.forEach(row => {
            pos.forEach(tag => {
                example_amount += row[tag].split('¶').length - 1;
            });
        });
        addView(`<div><span class="tag">예문 수</span><span> ${example_amount}개</span></div>`);
    }
}

function statistics(){
    let longest = ['', 0];
    let most_polysemous = ['', 0];
    
    dictionary.forEach(row => {
        let meaning_amount = 0;
        
        if(longest[1] < row['단어'].length){
            longest = [row['단어'], row['단어'].length];
        }
        if(dictionary_type == 'ver'){
            meaning_amount = row['뜻'].split(';').length;
        }
        if(dictionary_type == 'hor'){
            pos.forEach(tag => {
                row[tag] && (meaning_amount += row[tag].split(';').length);
            });
        }
        if(most_polysemous[1] < meaning_amount){
            most_polysemous = [row['단어'], meaning_amount];
        }
    });
    addView(`<div><span class="tag">가장 긴 단어</span><span> ${longest[0]}(${longest[1]}자)</span></div>`);
    addView(`<div><span class="tag">가장 뜻이 많은 단어</span><span> ${most_polysemous[0]}(${most_polysemous[1]}개)</span></div>`);
    addView(`<div><span class="tag">단일어 수       row['어원'] && addResult(`<div class="etymology">${row['어원']}</div>`);
        pos.forEach(el => {
            if(row[el]){
                addResult(`<div><span class="tag_em">${el}</span></div>`);
                addMeanings(row[el]);
            }
        });
        (row['설명'] || row['비고']) && addResult(`<div class="information">${row['설명'] || row['비고']}</div>`);
        tags.forEach(el => {
            if(!reserved_tags.includes(el) && !all_pos.includes(el) && row[el]){
                addResult(`<div><span class="tag">${el}</span> ${row[el]}</div>`);
            }
        });
    });
}

function information(){
    let example_amount = 0;
    
    addView(`<div class="head">${lang['언어명']}</div>`);
    lang['설명'] && addView(`<div class="information">${lang['설명']}</div>`);
    addView(`<div><span class="tag" style="margin-top: 10px;">코드</span><span> ${lang['코드']}</span></div>`);
    lang['집필자'] && addView(`<div><span class="tag">집필자</span><span> ${lang['집필자']}</span></div>`);
    addView(`<div><span class="tag">표제어 수</span><span> ${dictionary.length}개</span></div>`);
    if(dictionary_type == 'ver'){
        dictionary.forEach(row => {
            example_amount += row['뜻'].split('¶').length - 1;
        });
        addView(`<div><span class="tag">예문 수</span><span> ${example_amount}개</span></div>`);
    }
    if(dictionary_type = 'hor'){
        dictionary.forEach(row => {
            pos.forEach(tag => {
                example_amount += row[tag].split('¶').length - 1;
            });
        });
        addView(`<div><span class="tag">예문 수</span><span> ${example_amount}개</span></div>`);
    }
}

function statistics(){
    let longest = ['', 0];
    let most_polysemous = ['', 0];
    let free_morpheme_amount;
    let bound_morpheme_amount = 0;
    let simple_word_amount;
    let complex_word_amount = 0;
    
    dictionary.forEach(row => {
        let meaning_amount = 0;
        
        if(longest[1] < row['단어'].length){
            longest = [row['단어'], row['단어'].length];
        }
        if(dictionary_type == 'ver'){
            meaning_amount = row['뜻'].split(';').length;
        }
        if(dictionary_type == 'hor'){
            pos.forEach(tag => {
                row[tag] && (meaning_amount += row[tag].split(';').length);
            });
        }
        if(most_polysemous[1] < meaning_amount){
            most_polysemous = [row['단어'], meaning_amount];
        }
        if(row['단어'].includes('-')){
            bound_morpheme_amount++;
        }
        else{
            tags.includes('어원') && row['어원'].includes('+') && complex_word_amount++;
        }
    });
    free_morpheme_amount = dictionary.length - bound_morpheme_amount;
    tags.includes('어원') && (simple_word_amount = free_morpheme_amount - complex_word_amount);
    addView(`<div><span class="tag">가장 긴 단어</span><span> ${longest[0]}(${longest[1]}자)</span></div>`);
    addView(`<div><span class="tag">가장 뜻이 많은 단어</span><span> ${most_polysemous[0]}(${most_polysemous[1]}개)</span></div>`);
    addView(`<div class="head">형태소</div>`);
    addView(`<div>자립 형태소: ${round(free_morpheme_amount/dictionary.length*100)}%(${free_morpheme_amount}개) 
    의존 형태소: ${round(100 - round(free_morpheme_amount/dictionary.length*100))}%(${bound_morpheme_amount}개)</div>`);
    console.log(round(free_morpheme_amount/dictionary.length*100));
    tags.includes('어원') && addView(`<div class="head">단어</div>`);
    tags.includes('어원') && addView(`<div>단일어: ${round(simple_word_amount/free_morpheme_amount*100)}%(${simple_word_amount}개) 
    합성어: ${round(100 - round(simple_word_amount/free_morpheme_amount*100))}%(${complex_word_amount}개)</div>`);
}

function resetResult(){
    result.innerHTML = '';
}

function closeView(){
    view.innerHTML = '';
    search_input.style.display = 'block';
    result.style.display = 'block';
}

function addResult(html){
    result.insertAdjacentHTML('beforeend', html);
}

function addView(html){
    view.insertAdjacentHTML('beforeend', html);
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

function removeExamples(string){
    return string.replace(/ ¶[^;]*(;|$)/g, '$1');
}

function addMeanings(string){
    const meanings = string.split(';');
    if(meanings.length == 1){
        const el = meanings[0];

        addResult(`<div>${removeExamples(el)}</div>`)
        if(el.includes(' ¶')){
            const examples = el.split(' ¶').slice(1);
            examples.forEach(ex => {
                addResult(`<div class="example">${ex.split('  ')[0]}<br>${ex.split('  ')[1]}</div>`);
            });
        }
    }
    else{
        meanings.forEach((el, index) => {
            addResult(`<div>${index+1}. ${removeExamples(el)}</div>`);
            if(el.includes(' ¶')){
                const examples = el.split(' ¶').slice(1);
                examples.forEach(ex => {
                    addResult(`<div class="example">${ex.split('  ')[0]}<br>${ex.split('  ')[1]}</div>`);
                });
            }
        });
    }
}

function removeParens(string){
    return string.replace(/\[[^\[\]]*\]|\([^\(\)]*\)/g, '');
}

function round(num){
    return Math.round(num*10)/10;
}

setAssets().then(() => {
    setUI();
});
