const PY_BLOCKS = [
    {type:'py_when_run',message0:'when Run Python clicked',nextStatement:null,style:'event_blocks',tooltip:'Python starts here.'},
    {type:'py_print',message0:'print ( %1 )',args0:[{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'output_blocks'},
    {type:'py_input',message0:'input ( %1 )',args0:[{type:'input_value',name:'PROMPT'}],output:null,style:'input_blocks'},
    {type:'py_comment',message0:'# %1',args0:[{type:'field_input',name:'COMMENT',text:'comment'}],previousStatement:null,nextStatement:null,style:'misc_blocks'},
    {type:'py_assign',message0:'%1 = %2',args0:[{type:'field_input',name:'NAME',text:'variable'},{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'variable_blocks'},
    {type:'py_aug_assign',message0:'%1 %2= %3',args0:[{type:'field_input',name:'NAME',text:'variable'},{type:'field_dropdown',name:'OP',options:[['+','+'],['-','-'],['*','*'],['/','/'],['//','//'],['%','%'],['**','**']]},{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'variable_blocks'},
    {type:'py_variable',message0:'%1',args0:[{type:'field_input',name:'NAME',text:'variable'}],output:null,style:'variable_blocks'},
    {type:'py_delete',message0:'del %1',args0:[{type:'field_input',name:'NAME',text:'variable'}],previousStatement:null,nextStatement:null,style:'variable_blocks'},
    {type:'py_if',message0:'if %1 : %2',args0:[{type:'input_value',name:'COND'},{type:'input_statement',name:'DO'}],previousStatement:null,nextStatement:null,style:'logic_blocks'},
    {type:'py_if_else',message0:'if %1 : %2 else : %3',args0:[{type:'input_value',name:'COND'},{type:'input_statement',name:'DO'},{type:'input_statement',name:'ELSE'}],previousStatement:null,nextStatement:null,style:'logic_blocks'},
    {type:'py_compare',message0:'%1 %2 %3',args0:[{type:'input_value',name:'A'},{type:'field_dropdown',name:'OP',options:[['==','=='],['!=','!='],['<','<'],['<=','<='],['>','>'],['>=','>='],['is','is'],['is not','is not']]},{type:'input_value',name:'B'}],output:'Boolean',style:'logic_blocks'},
    {type:'py_boolean_op',message0:'%1 %2 %3',args0:[{type:'input_value',name:'A'},{type:'field_dropdown',name:'OP',options:[['and','and'],['or','or']]},{type:'input_value',name:'B'}],output:'Boolean',style:'logic_blocks'},
    {type:'py_not',message0:'not %1',args0:[{type:'input_value',name:'VALUE'}],output:'Boolean',style:'logic_blocks'},
    {type:'py_boolean',message0:'%1',args0:[{type:'field_dropdown',name:'VALUE',options:[['True','True'],['False','False']]}],output:'Boolean',style:'logic_blocks'},
    {type:'py_none',message0:'None',output:null,style:'logic_blocks'},
    {type:'py_ternary',message0:'%1 if %2 else %3',args0:[{type:'input_value',name:'YES'},{type:'input_value',name:'COND'},{type:'input_value',name:'NO'}],output:null,style:'logic_blocks'},
    {type:'py_for_range',message0:'for %1 in range ( %2 , %3 , %4 ) : %5',args0:[{type:'field_input',name:'NAME',text:'i'},{type:'input_value',name:'START'},{type:'input_value',name:'STOP'},{type:'input_value',name:'STEP'},{type:'input_statement',name:'DO'}],previousStatement:null,nextStatement:null,style:'loop_blocks'},
    {type:'py_for_each',message0:'for %1 in %2 : %3',args0:[{type:'field_input',name:'NAME',text:'item'},{type:'input_value',name:'ITERABLE'},{type:'input_statement',name:'DO'}],previousStatement:null,nextStatement:null,style:'loop_blocks'},
    {type:'py_while',message0:'while %1 : %2',args0:[{type:'input_value',name:'COND'},{type:'input_statement',name:'DO'}],previousStatement:null,nextStatement:null,style:'loop_blocks'},
    {type:'py_break',message0:'break',previousStatement:null,nextStatement:null,style:'loop_blocks'},
    {type:'py_continue',message0:'continue',previousStatement:null,nextStatement:null,style:'loop_blocks'},
    {type:'py_number',message0:'%1',args0:[{type:'field_number',name:'NUM',value:0}],output:'Number',style:'math_blocks'},
    {type:'py_arithmetic',message0:'%1 %2 %3',args0:[{type:'input_value',name:'A'},{type:'field_dropdown',name:'OP',options:[['+','+'],['-','-'],['*','*'],['/','/'],['//','//'],['%','%'],['**','**']]},{type:'input_value',name:'B'}],output:'Number',style:'math_blocks'},
    {type:'py_builtin_math',message0:'%1 ( %2 )',args0:[{type:'field_dropdown',name:'FN',options:[['abs','abs'],['round','round'],['int','int'],['float','float'],['min','min'],['max','max'],['sum','sum']]},{type:'input_value',name:'VALUE'}],output:null,style:'math_blocks'},
    {type:'py_math_function',message0:'math . %1 ( %2 )',args0:[{type:'field_dropdown',name:'FN',options:[['sqrt','sqrt'],['floor','floor'],['ceil','ceil'],['sin','sin'],['cos','cos'],['tan','tan'],['log','log'],['factorial','factorial']]},{type:'input_value',name:'VALUE'}],output:'Number',style:'math_blocks'},
    {type:'py_random_int',message0:'random . randint ( %1 , %2 )',args0:[{type:'input_value',name:'A'},{type:'input_value',name:'B'}],output:'Number',style:'math_blocks'},
    {type:'py_random_choice',message0:'random . choice ( %1 )',args0:[{type:'input_value',name:'VALUE'}],output:null,style:'math_blocks'},
    {type:'py_string',message0:'"%1"',args0:[{type:'field_input',name:'TEXT',text:'text'}],output:'String',style:'text_blocks'},
    {type:'py_fstring',message0:'f"%1"',args0:[{type:'field_input',name:'TEXT',text:'value = {variable}'}],output:'String',style:'text_blocks'},
    {type:'py_string_concat',message0:'%1 + %2',args0:[{type:'input_value',name:'A'},{type:'input_value',name:'B'}],output:'String',style:'text_blocks'},
    {type:'py_len',message0:'len ( %1 )',args0:[{type:'input_value',name:'VALUE'}],output:'Number',style:'text_blocks'},
    {type:'py_string_method',message0:'%1 . %2 ( )',args0:[{type:'input_value',name:'VALUE'},{type:'field_dropdown',name:'METHOD',options:[['upper','upper'],['lower','lower'],['title','title'],['strip','strip'],['split','split']]}],output:null,style:'text_blocks'},
    {type:'py_replace',message0:'%1 . replace ( %2 , %3 )',args0:[{type:'input_value',name:'VALUE'},{type:'input_value',name:'OLD'},{type:'input_value',name:'NEW'}],output:'String',style:'text_blocks'},
    {type:'py_subscript',message0:'%1 [ %2 : %3 ]',args0:[{type:'input_value',name:'VALUE'},{type:'input_value',name:'START'},{type:'input_value',name:'STOP'}],output:null,style:'text_blocks'},
    {type:'py_list',message0:'[ %1 , %2 , %3 ]',args0:[{type:'input_value',name:'A'},{type:'input_value',name:'B'},{type:'input_value',name:'C'}],output:'Array',style:'list_blocks'},
    {type:'py_list_get',message0:'%1 [ %2 ]',args0:[{type:'input_value',name:'LIST'},{type:'input_value',name:'INDEX'}],output:null,style:'list_blocks'},
    {type:'py_list_set',message0:'%1 [ %2 ] = %3',args0:[{type:'input_value',name:'LIST'},{type:'input_value',name:'INDEX'},{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'list_blocks'},
    {type:'py_list_append',message0:'%1 . append ( %2 )',args0:[{type:'input_value',name:'LIST'},{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'list_blocks'},
    {type:'py_list_remove',message0:'%1 . remove ( %2 )',args0:[{type:'input_value',name:'LIST'},{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'list_blocks'},
    {type:'py_list_method',message0:'%1 . %2 ( )',args0:[{type:'input_value',name:'LIST'},{type:'field_dropdown',name:'METHOD',options:[['sort','sort'],['reverse','reverse'],['clear','clear'],['copy','copy']]}],output:null,style:'list_blocks'},
    {type:'py_in',message0:'%1 %2 %3',args0:[{type:'input_value',name:'VALUE'},{type:'field_dropdown',name:'OP',options:[['in','in'],['not in','not in']]},{type:'input_value',name:'COLLECTION'}],output:'Boolean',style:'list_blocks'},
    {type:'py_function_hat',message0:'def %1 ( %2 ) : %3',args0:[{type:'field_input',name:'NAME',text:'function_name'},{type:'field_input',name:'PARAMS',text:'parameter'},{type:'input_statement',name:'DO'}],style:'procedure_blocks',tooltip:'Define a function. Separate parameter names with commas.'},
    {type:'py_return',message0:'return %1',args0:[{type:'input_value',name:'VALUE'}],previousStatement:null,nextStatement:null,style:'procedure_blocks'},
    {type:'py_library_call',message0:'%1 . %2 ( %3 )',args0:[{type:'field_input',name:'MODULE',text:'module'},{type:'field_input',name:'FUNCTION',text:'function'},{type:'input_value',name:'ARGS'}],output:null,style:'procedure_blocks'},
    {type:'py_raw_code',message0:'imported Python %1',args0:[{type:'field_input',name:'SUMMARY',text:'1 line'}],previousStatement:null,nextStatement:null,style:'output_blocks'}
];

Blockly.defineBlocksWithJsonArray(PY_BLOCKS);

Blockly.Blocks.py_function_call = {
    init() {
        this.functionName_ = 'function_name';
        this.parameters_ = [];
        this.setStyle('procedure_blocks');
        this.setOutput(true);
        this.setTooltip('Call a function defined by a function hat.');
        this.updateShape_();
    },
    updateShape_() {
        for (const input of [...this.inputList]) this.removeInput(input.name);
        this.appendDummyInput('OPEN').appendField(`${this.functionName_} (`);
        this.parameters_.forEach((parameter, index) => {
            const input = this.appendValueInput(`ARG${index}`);
            input.appendField(index === 0 ? parameter : `, ${parameter}`);
        });
        this.appendDummyInput('CLOSE').appendField(')');
    },
    mutationToDom() {
        const mutation = Blockly.utils.xml.createElement('mutation');
        mutation.setAttribute('name', this.functionName_);
        mutation.setAttribute('params', this.parameters_.join(','));
        return mutation;
    },
    domToMutation(xmlElement) {
        this.functionName_ = xmlElement.getAttribute('name') || 'function_name';
        this.parameters_ = (xmlElement.getAttribute('params') || '')
            .split(',').map(item => item.trim()).filter(Boolean);
        this.updateShape_();
    },
    saveExtraState() {
        return {name: this.functionName_, parameters: this.parameters_};
    },
    loadExtraState(state) {
        this.functionName_ = state.name || 'function_name';
        this.parameters_ = state.parameters || [];
        this.updateShape_();
    }
};

const py = window.python.pythonGenerator;
const O = window.python.Order;
const value = (g,b,n,f='None') => g.valueToCode(b,n,O.NONE) || f;
const suite = (g,b,n) => g.statementToCode(b,n) || `${g.INDENT}pass\n`;
const name = (b,n='NAME') => (b.getFieldValue(n) || 'variable').replace(/[^\w]/g,'_').replace(/^(\d)/,'_$1');
const quoted = (text) => `"${String(text).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n')}"`;
const expr = (code, order=O.ATOMIC) => [code,order];

py.forBlock.py_when_run=()=> '# When Run Python clicked\n';
py.forBlock.py_print=(b,g)=>`print(${value(g,b,'VALUE',"''")})\n`;
py.forBlock.py_input=(b,g)=>expr(`input(${value(g,b,'PROMPT',"''")})`,O.FUNCTION_CALL);
py.forBlock.py_comment=b=>`# ${(b.getFieldValue('COMMENT')||'').replace(/\r?\n/g,' ')}\n`;
py.forBlock.py_assign=(b,g)=>`${name(b)} = ${value(g,b,'VALUE')}\n`;
py.forBlock.py_aug_assign=(b,g)=>`${name(b)} ${b.getFieldValue('OP')}= ${value(g,b,'VALUE','0')}\n`;
py.forBlock.py_variable=b=>expr(name(b),O.ATOMIC);
py.forBlock.py_delete=b=>`del ${name(b)}\n`;
py.forBlock.py_if=(b,g)=>`if ${value(g,b,'COND','False')}:\n${suite(g,b,'DO')}`;
py.forBlock.py_if_else=(b,g)=>`if ${value(g,b,'COND','False')}:\n${suite(g,b,'DO')}else:\n${suite(g,b,'ELSE')}`;
py.forBlock.py_compare=(b,g)=>expr(`${value(g,b,'A')} ${b.getFieldValue('OP')} ${value(g,b,'B')}`,O.RELATIONAL);
py.forBlock.py_boolean_op=(b,g)=>expr(`${value(g,b,'A','False')} ${b.getFieldValue('OP')} ${value(g,b,'B','False')}`,b.getFieldValue('OP')==='and'?O.LOGICAL_AND:O.LOGICAL_OR);
py.forBlock.py_not=(b,g)=>expr(`not ${value(g,b,'VALUE','False')}`,O.LOGICAL_NOT);
py.forBlock.py_boolean=b=>expr(b.getFieldValue('VALUE'),O.ATOMIC);
py.forBlock.py_none=()=>expr('None',O.ATOMIC);
py.forBlock.py_ternary=(b,g)=>expr(`${value(g,b,'YES')} if ${value(g,b,'COND','False')} else ${value(g,b,'NO')}`,O.CONDITIONAL);
py.forBlock.py_for_range=(b,g)=>`for ${name(b)} in range(${value(g,b,'START','0')}, ${value(g,b,'STOP','10')}, ${value(g,b,'STEP','1')}):\n${suite(g,b,'DO')}`;
py.forBlock.py_for_each=(b,g)=>`for ${name(b)} in ${value(g,b,'ITERABLE','[]')}:\n${suite(g,b,'DO')}`;
py.forBlock.py_while=(b,g)=>`while ${value(g,b,'COND','False')}:\n${suite(g,b,'DO')}`;
py.forBlock.py_break=()=> 'break\n'; py.forBlock.py_continue=()=> 'continue\n';
py.forBlock.py_number=b=>expr(String(b.getFieldValue('NUM')),O.ATOMIC);
py.forBlock.py_arithmetic=(b,g)=>expr(`${value(g,b,'A','0')} ${b.getFieldValue('OP')} ${value(g,b,'B','0')}`,O.NONE);
py.forBlock.py_builtin_math=(b,g)=>expr(`${b.getFieldValue('FN')}(${value(g,b,'VALUE','0')})`,O.FUNCTION_CALL);
py.forBlock.py_math_function=(b,g)=>expr(`math.${b.getFieldValue('FN')}(${value(g,b,'VALUE','0')})`,O.FUNCTION_CALL);
py.forBlock.py_random_int=(b,g)=>expr(`random.randint(${value(g,b,'A','1')}, ${value(g,b,'B','10')})`,O.FUNCTION_CALL);
py.forBlock.py_random_choice=(b,g)=>expr(`random.choice(${value(g,b,'VALUE','[]')})`,O.FUNCTION_CALL);
py.forBlock.py_string=b=>expr(quoted(b.getFieldValue('TEXT')),O.ATOMIC);
py.forBlock.py_fstring=b=>expr(`f${quoted(b.getFieldValue('TEXT'))}`,O.ATOMIC);
py.forBlock.py_string_concat=(b,g)=>expr(`${value(g,b,'A',"''")} + ${value(g,b,'B',"''")}`,O.ADDITIVE);
py.forBlock.py_len=(b,g)=>expr(`len(${value(g,b,'VALUE',"''")})`,O.FUNCTION_CALL);
py.forBlock.py_string_method=(b,g)=>expr(`${value(g,b,'VALUE',"''")}.${b.getFieldValue('METHOD')}()`,O.FUNCTION_CALL);
py.forBlock.py_replace=(b,g)=>expr(`${value(g,b,'VALUE',"''")}.replace(${value(g,b,'OLD',"''")}, ${value(g,b,'NEW',"''")})`,O.FUNCTION_CALL);
py.forBlock.py_subscript=(b,g)=>expr(`${value(g,b,'VALUE',"''")}[${value(g,b,'START','')} : ${value(g,b,'STOP','')}]`,O.MEMBER);
py.forBlock.py_list=(b,g)=>expr(`[${value(g,b,'A')}, ${value(g,b,'B')}, ${value(g,b,'C')}]`,O.ATOMIC);
py.forBlock.py_list_get=(b,g)=>expr(`${value(g,b,'LIST','[]')}[${value(g,b,'INDEX','0')}]`,O.MEMBER);
py.forBlock.py_list_set=(b,g)=>`${value(g,b,'LIST','items')}[${value(g,b,'INDEX','0')}] = ${value(g,b,'VALUE')}\n`;
py.forBlock.py_list_append=(b,g)=>`${value(g,b,'LIST','items')}.append(${value(g,b,'VALUE')})\n`;
py.forBlock.py_list_remove=(b,g)=>`${value(g,b,'LIST','items')}.remove(${value(g,b,'VALUE')})\n`;
py.forBlock.py_list_method=(b,g)=>expr(`${value(g,b,'LIST','items')}.${b.getFieldValue('METHOD')}()`,O.FUNCTION_CALL);
py.forBlock.py_in=(b,g)=>expr(`${value(g,b,'VALUE')} ${b.getFieldValue('OP')} ${value(g,b,'COLLECTION','[]')}`,O.RELATIONAL);
py.forBlock.py_function_hat=(b,g)=>`def ${name(b)}(${(b.getFieldValue('PARAMS')||'').split(',').map(p=>p.trim().replace(/[^\w]/g,'_')).filter(Boolean).join(', ')}):\n${suite(g,b,'DO')}`;
py.forBlock.py_return=(b,g)=>`return ${value(g,b,'VALUE')}\n`;
py.forBlock.py_function_call=(b,g)=>{
    const args=b.parameters_.map((parameter,index)=>value(g,b,`ARG${index}`,'None'));
    return expr(`${b.functionName_}(${args.join(', ')})`,O.FUNCTION_CALL);
};
py.forBlock.py_library_call=(b,g)=>expr(`${name(b,'MODULE')}.${name(b,'FUNCTION')}(${value(g,b,'ARGS','')})`,O.FUNCTION_CALL);
py.forBlock.py_raw_code=b=>b.data?`${b.data.replace(/\s+$/,'')}\n`:'';

window.PyBlocksBlocks={
    enforceSingleRunEvent(workspace,createdIds){
        const events=workspace.getBlocksByType('py_when_run',false).filter(b=>!b.isInsertionMarker());
        if(events.length<=1)return;
        const created=createdIds.map(id=>workspace.getBlockById(id)).find(b=>b?.type==='py_when_run');
        if(created){Blockly.Events.disable();try{created.dispose(false);}finally{Blockly.Events.enable();}}
        window.PythonEngine?.showNotice('Only one “when Run Python clicked” event can exist.');
    }
};
