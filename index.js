let languages;
let lang;
let dictionary;
let dictionary_type;
let processed;
let example_dictionary = [];
let search;
let tags;
const reserved_tags = ['단어', '어원', '뜻', '품사', '설명', '비고', '분류'];
const all_pos = ['명사', '대명사', '의존명사', '분류사', '수분류사', '고유명사', '유정명사', '무정명사', '수사',
    '동사', '조동사', '계사', '경동사', '자동사', '타동사', '형용동사', '서술사',
    '한정사', '관사', '형용사', '관형사', '부사', '전치사', '후치사',
    '조사', '어두', '어미', '접속사', '감탄사', '의문사', '소사', '허사',
    '접두사', '접미사', '접요사', '접환사', '삽간사', '관통접사', '기타', '불명'];
let pos;
let allowed_pos;
let allowed_tags = {};
let search_exact_ex = false;
const menu = document.getElementById('menu');
const game = document.getElementById('game');
const view = document.getElementById('view');
const search_input = document.getElementById('search');
const result = document.getElementById('result');
const close_view = '<div class="button" style="margin-top: 50px;" onclick="closeView()">[닫기]</div>';

async function setAssets(){
    const response1 = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQWe2vHDfJZ6hiMH77Jlzl4lvdWjiPxtHi82mKNBfketCHSTfG4ClZf6crrXDQGfEcqa76su7SspZxY/pub?gid=0&output=csv');
    const text1 = await response1.text();
    languages = Papa.parse(text1, {
        header: true,
        skipEmptyLines: true
    }).data;
    let query = new URL(window.location.href).searchParams.get('lang');
    
    if(query == null){
        menu.style.visibility = 'hidden';
        game.style.visibility = 'hidden';
        search = search_language;
        if(search_input.value == ''){
            resetResult();
            addResult(`<div>완료!</div>`);
        };
    }
    else{
        lang = languages.find(el => el['코드'] == query);
        document.title = `${lang['언어명']} - tyx`;
        const link = lang['링크'];
        const response2 = await fetch(`${link}`);
        const text2 = await response2.text();
        dictionary = Papa.parse(text2, {
            header: true,
            skipEmptyLines: true
        }).data;
        tags = Object.keys(dictionary[0]);
        processed = [...dictionary];
        if(tags.includes('뜻')){
            search = search_ver;
            tags.forEach(tag => {
                if(tag == '품사' || tag.startsWith(':')){
                    allowed_tags[tag] = new Set([]);
                }
            });
            dictionary.forEach(row => {
                Array.from(row['뜻'].matchAll(/ ¶([^¶;]*)(?=\s¶|;|$)/g)).forEach(match => {
                    const ex = match[1];
                    example_dictionary.push(ex.split('  '));
                });
            });
            dictionary_type = 'ver';
        }
        else{
            search = search_hor;
            pos = tags.filter(el => all_pos.includes(el));
            allowed_pos = new Set(pos);
            dictionary.forEach(row => {
                pos.forEach(tag => {
                    Array.from(row[tag].matchAll(/ ¶([^¶;]*)(?=\s¶|;|$)/g)).forEach(match => {
                        const ex = match[1];
                        example_dictionary.push(ex.split('  '));
                    });
                });
            });
            dictionary_type = 'hor';
        }
        if(search_input.value == ''){
            resetResult();
            addResult(`<div>완료!</div>`);
        }
        else{
            search(search_input.value);
        }
    }
}

function setUI(){
    const buttons = ['information', 'filter', 'examples',
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
    const target_lower = target.toLowerCase();
    const result_word_start = processed.filter(row => row['단어'].toLowerCase().startsWith(target_lower)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_word_include = processed.filter(row => row['단어'].toLowerCase().includes(target_lower)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_meaning_equal = processed.filter(row => removeExamples(row['뜻']).split(/,\s|;\s/).some(meaning => meaning.toLowerCase() == target || removeParens(meaning.toLowerCase()) == target_lower));
    const result_meaning_start = processed.filter(row => removeExamples(row['뜻']).split(/,\s|;\s/).some(meaning => meaning.toLowerCase().startsWith(target) || removeParens(meaning).toLowerCase().startsWith(target_lower)));
    const result_meaning_include = processed.filter(row => removeExamples(row['뜻']).split(/,\s|;\s/).some(meaning => meaning.toLowerCase().includes(target)));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_equal, result_meaning_start, result_meaning_include]);
    
    result_arr.slice(0, 100).forEach(row => {
        addResult(`<div class="head">${row['단어']} ${lang['편집'] && `<a href="${lang['편집']}&range=A${dictionary.indexOf(row)+2}" target="_blank" class="edit">[편집]</a>`}</div>`);
        row['어원'] && addResult(`<div class="etymology">${row['어원']}</div>`);
        row['품사'] && addResult(`<div class="tag_em">${row['품사']}</div>`);
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
    const target_lower = target.toLowerCase();
    const allowed_pos_array = Array.from(allowed_pos);
    const result_word_start = processed.filter(row => allowed_pos_array.some(tag => row[tag].length != 0) && row['단어'].toLowerCase().startsWith(target_lower)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_word_include = processed.filter(row => allowed_pos_array.some(tag => row[tag].length != 0) && row['단어'].toLowerCase().includes(target_lower)).toSorted((a, b) => a['단어'].length - b['단어'].length || a['단어'].localeCompare(b['단어']));
    const result_meaning_equal = processed.filter(row => allowed_pos_array.some(tag => removeExamples(row[tag]).split(/,\s|;\s/).some(el => el.toLowerCase() == target_lower || removeParens(el.toLowerCase()) == target_lower)));
    const result_meaning_start = processed.filter(row => allowed_pos_array.some(tag => removeExamples(row[tag]).split(/,\s|;\s/).some(el => el.toLowerCase().startsWith(target_lower) || removeParens(el.toLowerCase()).startsWith(target_lower))));
    const result_meaning_include = processed.filter(row => allowed_pos_array.some(tag => removeExamples(row[tag]).split(/,\s|;\s/).some(el => el.toLowerCase().includes(target_lower))));
    const result_arr = merge([result_word_start, result_word_include, result_meaning_equal, result_meaning_start, result_meaning_include]);
    
    result_arr.slice(0, 100).forEach(row => {
        addResult(`<div class="head">${row['단어']} ${lang['편집'] && `<a href="${lang['편집']}&range=A${dictionary.indexOf(row)+2}" target="_blank" class="edit">[편집]</a>`}</div>`);
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

function search_ex(target){
    resetResult();
    if(target == ''){
        return;
    }
    const reg_exact = new RegExp(`(?:^|\\s)${target}[\\s\\.,\\!\\?$]`, 'i');
    const reg_rough = new RegExp(target, 'i');
    const result_exs_exact = example_dictionary.filter(row => row.some(el => el.match(reg_exact)));
    const result_exs_rough = example_dictionary.filter(row => row.some(el => el.match(reg_rough)));
    const result_arr = merge([result_exs_exact, result_exs_rough]);

    if(search_exact_ex){
        result_exs_exact.slice(0, 100).forEach(ex => {
            addResult(`<div class="example-independent">${ex.join('<br>')}</div>`);
        });
    }
    else{
        result_arr.slice(0, 100).forEach(ex => {
            addResult(`<div class="example-independent">${ex.join('<br>')}</div>`);
        });
    }
}

function information(){
    let example_amount = 0;
    
    addView(`<div class="head">${lang['언어명']}</div>`);
    lang['설명'] && addView(`<div class="information">${lang['설명']}</div>`);
    addView(`<div style="margin-top: 25px;"><span class="tag">코드</span><span> ${lang['코드']}</span></div>`);
    lang['집필자'] && addView(`<div><span class="tag">집필자</span><span> ${lang['집필자']}</span></div>`);
    addView(`<div><span class="tag">표제어 수</span><span> ${dictionary.length}개</span></div>`);
    if(dictionary_type == 'ver'){
        dictionary.forEach(row => {
            example_amount += row['뜻'].split('¶').length - 1;
        });
        addView(`<div><span class="tag">예문 수</span><span> ${example_amount}개</span></div>`);
    }
    if(dictionary_type == 'hor'){
        dictionary.forEach(row => {
            pos.forEach(tag => {
                example_amount += row[tag].split('¶').length - 1;
            });
        });
        addView(`<div><span class="tag">예문 수</span><span> ${example_amount}개</span></div>`);
    }
}

function filter(){
    let pos_amount = {};
    let pos_button_string = '';
    
    if(dictionary_type == 'ver'){
        tags.includes('품사') && addView(`<div class="head">품사</div>`);
        tags.includes('품사') && dictionary.forEach(row => {
            if(Object.keys(pos_amount).includes(row['품사'])){
                pos_amount[row['품사']]++;
            }
            else{
                pos_amount[row['품사']] = 1;
            }
        });
        tags.includes('품사') && Object.keys(pos_amount).sort((a, b) => pos_amount[b] - pos_amount[a]).forEach(tag => {
            pos_button_string += `<span class="button${allowed_tags['품사'].has(tag) ? ' activated' : ''}" onclick="this.classList.toggle('activated'); toggle(allowed_tags['품사'], '${tag}'); filterProcess(); search(search_input.value);">[${tag}]</span> `;
        });
    }
    if(dictionary_type == 'hor'){
        addView(`<div class="head">품사</div>`);
        pos.forEach(tag => {
            pos_button_string += `<span class="button${allowed_pos.size != pos.length && allowed_pos.has(tag) ? ' activated' : ''}" onclick="this.classList.toggle('activated'); allowed_pos.size == pos.length && (allowed_pos = new Set([]));
            toggle(allowed_pos, '${tag}'); allowed_pos.size == 0 && (allowed_pos = new Set(pos)); search(search_input.value);">[${tag}]</span> `;
        });
    }
    pos_button_string = pos_button_string.trimEnd();
    addView(`<div>${pos_button_string}</div>`);
}

function examples(){
    addView(`<div class="head">예문 검색</div>`);
    addView(`<div><span class="button${search == search_ex ? ' activated' : ''}" onclick="this.classList.toggle('activated') ? (search = search_ex) : (search = search_${dictionary_type}); search(search_input.value);">[켜기]</div>`);
    addView(`<div class="head">예문 필터</div>`);
    addView(`<div><span class="button${search_exact_ex ? ' activated' : ''}" onclick="this.classList.toggle('activated'); search_exact_ex = !search_exact_ex;">[정확히 일치]</span></div>`);
}

function sort(){
    
}

function statistics(){
    let longest = ['', 0];
    let most_polysemous = ['', 0];
    let free_morpheme_amount;
    let bound_morpheme_amount = 0;
    let simple_word_amount;
    let complex_word_amount = 0;
    let pos_amount = {};
    dictionary_type == 'hor' && pos.forEach(tag => {pos_amount[tag] = 0;});
    let pos_ratio_string = '';
    
    dictionary.forEach(row => {
        let meaning_amount = 0;
        
        if(longest[1] < row['단어'].length){
            longest = [row['단어'], row['단어'].length];
        }
        if(dictionary_type == 'ver'){
            meaning_amount = row['뜻'].split(';').length;
            if(tags.includes('품사')){
                if(Object.keys(pos_amount).includes(row['품사'])){
                    pos_amount[row['품사']]++;
                }
                else{
                    pos_amount[row['품사']] = 1;
                }
            }
        }
        if(dictionary_type == 'hor'){
            pos.forEach(tag => {
                if(row[tag]){
                    meaning_amount += row[tag].split(';').length;
                    pos_amount[tag]++;
                }
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
    addView(`<div class="head">단어</div>`);
    addView(`<div><span class="tag">가장 긴 단어</span><span> ${longest[0]}(${longest[1]}자)</span></div>`);
    addView(`<div><span class="tag">가장 뜻이 많은 단어</span><span> ${most_polysemous[0]}(${most_polysemous[1]}개)</span></div>`);
    addView(`<div class="head">형태소 비율</div>`);
    addView(`<div><span class="tag">자립 형태소</span><span> ${round(free_morpheme_amount/dictionary.length*100)}%(${free_morpheme_amount}개)</span> 
    <span class="tag">의존 형태소</span><span> ${round(100 - round(free_morpheme_amount/dictionary.length*100))}%(${bound_morpheme_amount}개)</span></div>`);
    tags.includes('어원') && addView(`<div class="head">단어 비율</div>`);
    tags.includes('어원') && addView(`<div><span class="tag">단일어</span><span> ${round(simple_word_amount/free_morpheme_amount*100)}%(${simple_word_amount}개)</span> 
    <span class="tag">합성어</span><span> ${round(100 - round(simple_word_amount/free_morpheme_amount*100))}%(${complex_word_amount}개)</span></div>`);
    addView(`<div class="head">품사별 비율</div>`);
    if(dictionary_type == 'ver'){
        Object.keys(pos_amount).sort((a, b) => pos_amount[b] - pos_amount[a]).forEach(tag => {
            pos_ratio_string += `<span class="tag">${tag}</span><span> ${round(pos_amount[tag]/dictionary.length*100)}%(${pos_amount[tag]}개)</span> `;
        });
    }
    if(dictionary_type == 'hor'){
        Object.keys(pos_amount).forEach(tag => {
            pos_ratio_string += `<span class="tag">${tag}</span><span> ${round(pos_amount[tag]/dictionary.length*100)}%(${pos_amount[tag]}개)</span> `;
        });
    }
    pos_ratio_string = pos_ratio_string.slice(0, -1);
    addView(`<div>${pos_ratio_string}</div>`);
}

function word_chain(){
    globalThis.used_words = [];
    globalThis.bot_words = new Set(dictionary.filter(() => Math.random() < 0.3).map(row => row['단어']));
    globalThis.last_letter = '';
    globalThis.game_over = 0;
    addView(`<div id="box"></div><input class="input" onkeydown="addChain(this, event);">`);
    globalThis.box = document.getElementById('box');
    
    if(Math.random() < 0.5){
        const bot_word = Array.from(bot_words)[Math.floor(Math.random() * bot_words.size)];
        bot_words.delete(bot_word);
        used_words.push(bot_word);
        last_letter = bot_word[bot_word.length - 1];
        
        addBox(`<div><span class="tag">봇</span><span> ${bot_word}</span></div>`);
        addBox('<div></div>');
    }
    else{
        addBox('<div>선공입니다.</div><div class="information">시작할 단어를 입력하세요.</div>');
    }
}

function resetResult(){
    result.innerHTML = '';
}

function closeView(){
    view.innerHTML = '';
    search_input.style.display = 'block';
    result.style.display = 'block';
}

function resetBox(){
    box.innerHTML = '';
}

function addResult(html){
    result.insertAdjacentHTML('beforeend', html);
}

function addView(html){
    view.insertAdjacentHTML('beforeend', html);
}

function addBox(html){
    box.insertAdjacentHTML('beforeend', html);
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
                addResult(`<div class="example">${ex.replace(/\s\s/g, '<br>')}</div>`);
            });
        }
    }
    else{
        meanings.forEach((el, index) => {
            addResult(`<div>${index+1}. ${removeExamples(el)}</div>`);
            if(el.includes(' ¶')){
                const examples = el.split(' ¶').slice(1);
                examples.forEach(ex => {
                    addResult(`<div class="example">${ex.replace(/\s\s/g, '<br>')}</div>`);
                });
            }
        });
    }
}

function removeParens(string){
    return string.replace(/\[[^\[\]]*\]|\([^\(\)]*\)/g, '');
}

function toggle(set, element){
    if(set.has(element)){
        set.delete(element);
    }
    else{
        set.add(element);
    }
}

function filterProcess(){
    let temp = dictionary.filter(row => Object.keys(allowed_tags).every(tag => allowed_tags[tag].has(row[tag])));
    processed = temp.length == 0 ? [...dictionary] : temp;
}

function round(num){
    return Math.round(num*10)/10;
}

function addChain(input, event){
    if(event.key == 'Enter' && game_over == 0){
        const word = input.value;
        
        input.value = '';
        if(game_over == 0){
            resetBox();
            if(dictionary.some(row => row['단어'] == word) && !used_words.includes(word) && word.startsWith(last_letter)){
                console.log(bot_words.delete(word));
                used_words.push(word);
                last_letter = word[word.length - 1];
                const bot_words_arr = Array.from(bot_words);
                const possible_words = bot_words_arr.filter(el => el.startsWith(last_letter));
                
                if(possible_words.length == 0){
                    addBox(`<div>승리했습니다!</div>`);
                    game_over = 1;
                }
                else{
                    const bot_word = possible_words[Math.floor(Math.random() * possible_words.length)];
                    
                    addBox(`<div><span class="tag">나</span><span> ${word}</span></div>`);
                    addBox(`<div><span class="tag">봇</span><span> ${bot_word}</span></div>`);
                    console.log(bot_words.delete(bot_word));
                    used_words.push(bot_word);
                    last_letter = bot_word[bot_word.length - 1];
                }
            }
            else{
                addBox(`<div>패배했습니다!</div>`);
                game_over = 1;
            }
        }
    }
}

addResult(`<div>시트를 불러오는 중입니다...</div>`);
setAssets().then(() => {
    setUI();
});
