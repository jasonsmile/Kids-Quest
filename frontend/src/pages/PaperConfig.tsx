import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

interface FormulaItem {
  min: number;
  max: number;
  operators: number[] | null;
}

interface FormData {
  step: string;
  numberOfFormulas: number;
  whereIsResult: string;
  enableBrackets: boolean;
  carry: string;
  abdication: string;
  remainder: string;
  solution: string;
  numberOfPapers: number;
  numberOfPagerColumns: number;
  paperTitle: string;
  paperSubTitle: string;
  fileNameGeneratedRule: string;
  formulaList: FormulaItem[];
  resultMinValue: number;
  resultMaxValue: number;
  generateMode: string;
  customFormulaList: { formula: string }[];
  numberMode: 'integer' | 'decimal';
  decimalPlaces: number;
}

interface PaperConfig {
  id: string;
  configName: string;
  step: number;
  formulaList: string;
  resultMinValue: number;
  resultMaxValue: number;
  numberOfFormulas: number;
  whereIsResult: number;
  enableBrackets: boolean;
  carry: number;
  abdication: number;
  remainder: number;
  solution: number;
  numberOfPapers: number;
  numberOfPagerColumns: number;
  paperTitle: string;
  paperSubTitle: string;
  fileNameGeneratedRule: string;
  generateMode: number;
  customFormulaList: string | null;
  paperListData: string | null;
  numberMode: 'integer' | 'decimal';
  decimalPlaces: number | null;
  isDefault: boolean;
  isActive: boolean;
}

type ChineseItem = {
  pinyin: string;
  answer: string;
};

type ChineseConfig = {
  id: string;
  configName: string;
  isActive: boolean;
  isEnabled: boolean;
  dailyCount: number;
  items: ChineseItem[];
  updatedAt: string;
};

const parseChineseText = (text: string) => {
  const lines = text.split(/\r?\n/);
  const items: ChineseItem[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      errors.push(`第 ${index + 1} 行缺少 =`);
      return;
    }

    const pinyin = trimmed.slice(0, separatorIndex).trim();
    const answer = trimmed.slice(separatorIndex + 1).trim();
    if (!pinyin || !answer) {
      errors.push(`第 ${index + 1} 行需要同时填写拼音和汉字`);
      return;
    }

    const key = `${pinyin.toLowerCase()}=${answer}`;
    if (seen.has(key)) {
      errors.push(`第 ${index + 1} 行重复：${trimmed}`);
      return;
    }

    seen.add(key);
    items.push({ pinyin, answer });
  });

  return { items, errors };
};

const formatChineseText = (items: ChineseItem[]) =>
  items.map((item) => `${item.pinyin}=${item.answer}`).join('\n');

const PINYIN_INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
const PINYIN_FINALS = [
  'a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er',
  'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'ia', 'iao', 'ian', 'iang',
  'iong', 'ua', 'uo', 'uai', 'uan', 'uang', 'ueng'
];
const PINYIN_TONES = [
  { value: 1, label: '一声' },
  { value: 2, label: '二声' },
  { value: 3, label: '三声' },
  { value: 4, label: '四声' },
  { value: 0, label: '轻声' },
];
const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};
const PINYIN_CANDIDATES: Record<string, string[]> = {
  dong: ['东', '冬', '懂', '动', '洞'],
  tian: ['天', '田', '甜', '填'],
  hu: ['胡', '湖', '虎', '户', '呼'],
  zi: ['子', '字', '自', '紫'],
  qing: ['青', '晴', '清', '情', '请'],
  ming: ['明', '名', '鸣', '命'],
  xia: ['夏', '下', '霞', '吓'],
  he: ['禾', '河', '和', '合'],
  miao: ['苗', '秒', '妙', '庙'],
  wen: ['文', '问', '温', '闻'],
};

const normalizePinyinKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .replace(/ǖ|ǘ|ǚ|ǜ/g, 'v')
    .toLowerCase();

const applyTone = (syllable: string, tone: number) => {
  if (!tone) return syllable;
  const target = ['a', 'o', 'e'].find((vowel) => syllable.includes(vowel))
    || (syllable.includes('iu') ? 'u' : syllable.includes('ui') ? 'i' : ['i', 'u', 'ü'].find((vowel) => syllable.includes(vowel)));
  if (!target) return syllable;
  return syllable.replace(target, TONE_MARKS[target][tone - 1]);
};

export const PaperConfig: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<FormData>({
    step: '1',
    numberOfFormulas: 30,
    whereIsResult: '0',
    enableBrackets: false,
    carry: '1',
    abdication: '1',
    remainder: '2',
    solution: '0',
    numberOfPapers: 1,
    numberOfPagerColumns: 3,
    paperTitle: '小学生口算题',
    paperSubTitle: '姓名：__________ 日期：____月____日 时间：________ 对题：____道',
    fileNameGeneratedRule: 'title',
    formulaList: [
      { min: 1, max: 9, operators: null },
      { min: 1, max: 9, operators: [1] }
    ],
    resultMinValue: 1,
    resultMaxValue: 9,
    generateMode: '1',
    customFormulaList: [{ formula: '' }],
    numberMode: 'integer',
    decimalPlaces: 2
  });
  const [configs, setConfigs] = useState<PaperConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>('');
  const [paperList, setPaperList] = useState<any[]>([]);
  const [optionsDrawerVisible, setOptionsDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'math' | 'chinese'>('math');
  const [chineseEnabled, setChineseEnabled] = useState(false);
  const [chineseDailyCount, setChineseDailyCount] = useState(10);
  const [chineseText, setChineseText] = useState('');
  const [chineseConfigs, setChineseConfigs] = useState<ChineseConfig[]>([]);
  const [chineseModalOpen, setChineseModalOpen] = useState(false);
  const [editingChineseConfig, setEditingChineseConfig] = useState<ChineseConfig | null>(null);
  const [currentPinyinInput, setCurrentPinyinInput] = useState('');
  const [pinyinResult, setPinyinResult] = useState<string[]>([]);
  const [currentTone, setCurrentTone] = useState(1);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [savingChinese, setSavingChinese] = useState(false);
  const [dailyFrequency, setDailyFrequency] = useState(1); // 用于显示和对比

  const operatorOptions = [
    { key: 1, label: '+(加法)' },
    { key: 2, label: '-(减法)' },
    { key: 3, label: '×(乘法)' },
    { key: 4, label: '÷(除法)' }
  ];

  const stepOptions = [
    { key: '1', label: "一步运算", disabled: false },
    { key: '2', label: "两步运算", disabled: formData.remainder === '3' },
    { key: '3', label: "三步运算", disabled: formData.remainder === '3' }
  ];

  const whereIsResultOptions = [
    { key: '0', label: "求结果", disabled: false },
    { key: '1', label: "求算数项", disabled: formData.remainder === '3' }
  ];

  const remainderOptions = [
    { key: '1', label: "随机余数", disabled: false },
    { key: '2', label: "结果整除", disabled: false },
    { key: '3', label: "结果余数", disabled: formData.whereIsResult === '1' || parseInt(formData.step) > 1 }
  ];

  useEffect(() => {
    if (id) {
      loadConfigs(id);
      loadChineseConfig(id);
    }
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(params.get('tab') === 'chinese' ? 'chinese' : 'math');
  }, [location.search]);

  const loadConfigs = async (childId: string, keepActiveId?: string) => {
    try {
      const response = await api.parents.getPaperConfigs(childId);
      // 同时获取练习配置（每日频率）
      const practiceConfigRes = await api.parents.getPracticeConfig(childId);
      setDailyFrequency(practiceConfigRes.data?.dailyFrequency || 1);
      
      setConfigs(response.data);
      if (response.data.length > 0) {
        const activeConfig = response.data.find((c: PaperConfig) => c.isActive);
        const defaultConfig = response.data.find((c: PaperConfig) => c.isDefault);
        const fallbackConfig = activeConfig || defaultConfig || response.data[0];

        // 如果没有活跃配置，自动激活默认配置
        if (!activeConfig && fallbackConfig) {
          try {
            await api.parents.setActivePaperConfig(childId, fallbackConfig.id);
          } catch (e) {
            console.error('Failed to auto-activate config:', e);
          }
        }

        const targetId = keepActiveId || fallbackConfig?.id;
        setActiveConfigId(targetId || '');
        const configToLoad = response.data.find((c: PaperConfig) => c.id === targetId) || fallbackConfig;
        if (configToLoad) {
          loadConfigData(configToLoad);
        }
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  const loadChineseConfig = async (childId: string) => {
    try {
      const [configResponse, configsResponse] = await Promise.all([
        api.parents.getChineseConfig(childId),
        api.parents.getChineseConfigs(childId)
      ]);
      const config = configResponse.data;
      setChineseEnabled(Boolean(config?.isEnabled));
      setChineseDailyCount(config?.dailyCount || 10);
      setChineseConfigs(configsResponse.data || []);
    } catch (error) {
      console.error('Failed to load Chinese config:', error);
    }
  };

  const saveChineseConfig = async () => {
    if (!id) return;
    const parsed = parseChineseText(chineseText);
    if (parsed.errors.length > 0) {
      alert(parsed.errors.join('\n'));
      return;
    }
    if (chineseEnabled && parsed.items.length === 0) {
      alert('启用语文练习前，请至少添加 1 条词语');
      return;
    }

    try {
      setSavingChinese(true);
      if (editingChineseConfig) {
        await api.parents.updateChineseConfigById(id, editingChineseConfig.id, {
          configName: editingChineseConfig.configName,
          items: parsed.items,
        });
      } else {
        await api.parents.addChineseConfig(id, {
          configName: `词表${chineseConfigs.length + 1}`,
          items: parsed.items,
        });
      }
      closeChineseModal();
      await loadChineseConfig(id);
      alert('词表已保存');
    } catch (error: any) {
      alert(`保存失败：${error.message}`);
    } finally {
      setSavingChinese(false);
    }
  };

  const resetChineseDraft = () => {
    setChineseText('');
    setCurrentPinyinInput('');
    setPinyinResult([]);
    setCurrentAnswer('');
    setCurrentTone(1);
  };

  const openCreateChineseModal = () => {
    setEditingChineseConfig(null);
    resetChineseDraft();
    setChineseModalOpen(true);
  };

  const openEditChineseModal = (config: ChineseConfig) => {
    setEditingChineseConfig(config);
    setChineseText(formatChineseText(config.items || []));
    setCurrentPinyinInput('');
    setPinyinResult([]);
    setCurrentAnswer('');
    setCurrentTone(1);
    setChineseModalOpen(true);
  };

  const closeChineseModal = () => {
    setChineseModalOpen(false);
    setEditingChineseConfig(null);
    resetChineseDraft();
  };

  const setActiveChineseConfig = async (configId: string) => {
    if (!id) return;
    if (!confirm('确定使用该词表给孩子练习吗？')) return;

    try {
      await api.parents.setActiveChineseConfig(id, configId);
      await loadChineseConfig(id);
      alert('已切换使用词表');
    } catch (error: any) {
      alert(`切换失败：${error.message}`);
    }
  };

  const deleteChineseConfig = async (configId: string) => {
    if (!id) return;
    if (!confirm('确定删除这个词表吗？')) return;

    try {
      await api.parents.deleteChineseConfig(id, configId);
      await loadChineseConfig(id);
      alert('删除成功');
    } catch (error: any) {
      alert(`删除失败：${error.message}`);
    }
  };

  const currentRawPinyin = currentPinyinInput;
  const currentPinyin = applyTone(currentRawPinyin, currentTone);
  const confirmedPinyin = pinyinResult.join(' ');
  const lookupPinyin = pinyinResult[pinyinResult.length - 1] || currentPinyin;
  const currentCandidates = PINYIN_CANDIDATES[normalizePinyinKey(lookupPinyin)] || [];

  const appendPinyinInput = (value: string) => {
    setCurrentPinyinInput((current) => `${current}${value}`);
  };

  const deletePinyinInput = () => {
    setCurrentPinyinInput((current) => Array.from(current).slice(0, -1).join(''));
  };

  const confirmCurrentPinyin = () => {
    if (!currentPinyin) return;
    setPinyinResult((current) => [...current, currentPinyin]);
    setCurrentPinyinInput('');
  };

  const deletePinyinResult = () => {
    setPinyinResult([]);
  };

  const addChineseItem = () => {
    const answer = currentAnswer.trim();
    const pinyin = confirmedPinyin || currentPinyin;
    if (!pinyin || !answer) {
      alert('请先选择拼音并输入汉字');
      return;
    }

    const nextItems = [...parseChineseText(chineseText).items, { pinyin, answer }];
    setChineseText(formatChineseText(nextItems));
    setCurrentPinyinInput('');
    setPinyinResult([]);
    setCurrentAnswer('');
  };

  const removeChineseItem = (index: number) => {
    const nextItems = parseChineseText(chineseText).items.filter((_, itemIndex) => itemIndex !== index);
    setChineseText(formatChineseText(nextItems));
  };

  const resetToDefault = async () => {
    try {
      const response = await api.parents.resetPaperConfig(id!);
      const defaultConfig = response.data;
      loadConfigData(defaultConfig);
    } catch (error) {
      console.error('Failed to reset config:', error);
    }
  };

  const loadConfigData = (config: PaperConfig) => {
    const parsedFormulaList = JSON.parse(config.formulaList);
    const parsedCustomFormulaList = config.customFormulaList ? JSON.parse(config.customFormulaList) : [{ formula: '' }];

    setFormData({
      step: config.step.toString(),
      numberOfFormulas: config.numberOfFormulas,
      whereIsResult: config.whereIsResult.toString(),
      enableBrackets: config.enableBrackets,
      carry: config.carry.toString(),
      abdication: config.abdication.toString(),
      remainder: config.remainder.toString(),
      solution: config.solution.toString(),
      numberOfPapers: config.numberOfPapers,
      numberOfPagerColumns: config.numberOfPagerColumns,
      paperTitle: config.paperTitle,
      paperSubTitle: config.paperSubTitle,
      fileNameGeneratedRule: config.fileNameGeneratedRule,
      formulaList: parsedFormulaList,
      resultMinValue: config.resultMinValue,
      resultMaxValue: config.resultMaxValue,
      generateMode: config.generateMode.toString(),
      customFormulaList: parsedCustomFormulaList,
      numberMode: config.numberMode || 'integer',
      decimalPlaces: config.decimalPlaces ?? 2
    });

    // 恢复 paperList（从 paperListData 恢复，如果不存在则从配置参数重建）
    if (config.paperListData) {
      try {
        const restoredPaperList = JSON.parse(config.paperListData);
        setPaperList(restoredPaperList);
      } catch (error) {
        console.error('Failed to parse paperListData:', error);
        // 如果解析失败，从配置参数重建
        setPaperList([]);
      }
    } else {
      // 如果没有保存的 paperListData，从配置参数重建
      if (config.generateMode === 2) {
        const validFormulas = parsedCustomFormulaList.filter((item: any) => item.formula && item.formula.trim());
        if (validFormulas.length > 0) {
          setPaperList([{
            customFormulaList: validFormulas,
            numberOfFormulas: validFormulas.length,
            numberMode: config.numberMode || 'integer',
            decimalPlaces: config.decimalPlaces
          }]);
        } else {
          setPaperList([]);
        }
      } else {
        setPaperList([{
          step: config.step,
          numberOfFormulas: config.numberOfFormulas,
          whereIsResult: config.whereIsResult,
          formulaList: parsedFormulaList,
          resultMinValue: config.resultMinValue,
          resultMaxValue: config.resultMaxValue,
          numberMode: config.numberMode,
          decimalPlaces: config.decimalPlaces
        }]);
      }
    }
  };

  const changeStep = (val: string) => {
    const difference = parseInt(val) - formData.formulaList.length + 1;
    const newFormulaList = [...formData.formulaList];

    if (difference > 0) {
      for (let i = 1; i <= difference; i++) {
        newFormulaList.push({ min: 1, max: 9, operators: [1] });
      }
    } else if (difference < 0) {
      newFormulaList.splice(difference, Math.abs(difference));
    }
    setFormData({ ...formData, step: val, formulaList: newFormulaList });
  };

  const append = () => {
    console.log('append 函数被调用');
    console.log('当前 formData:', formData);
    console.log('当前 paperList:', paperList);
    
    // 参考 PrimarySchoolMathematics 的实现，添加表单验证
    if (formData.generateMode === '2') {
      console.log('手动添加模式');
      // 手动添加模式：处理自定义公式
      const customFormulaList = formData.customFormulaList
        .filter(item => item.formula && item.formula.trim())
        .map(item => {
          let formula = item.formula.replace(/\*/g, '×').replace(/\//g, '÷').trim();
          if (!formula.endsWith('=')) {
            formula += '=';
          }
          formula = formula.replace(/\s+/g, '');
          return { formula };
        });
      
      console.log('处理后的 customFormulaList:', customFormulaList);
      
      if (customFormulaList.length === 0) {
        alert('请至少添加一道题目');
        return;
      }
      
      const newPaperList = [...paperList, {
        customFormulaList,
        numberOfFormulas: customFormulaList.length,
        numberMode: formData.numberMode,
        decimalPlaces: formData.numberMode === 'decimal' ? formData.decimalPlaces : null
      }];
      console.log('新的 paperList:', newPaperList);
      setPaperList(newPaperList);
      // 同时更新 formData.customFormulaList 以便保存
      setFormData({ ...formData, customFormulaList });
      console.log('状态已更新');
      alert(`成功添加 ${customFormulaList.length} 道题目`);
    } else {
      console.log('自动生成模式');
      // 自动生成模式：处理自动生成配置
      const { step, numberOfFormulas, whereIsResult, formulaList, resultMinValue, resultMaxValue } = formData;
      
      console.log('参数值:', { step, numberOfFormulas, whereIsResult, resultMinValue, resultMaxValue });
      
      // 验证必填字段 - 放宽验证条件
      if (!step || step === '' || numberOfFormulas <= 0 || whereIsResult === '' || resultMinValue === null || resultMaxValue === null) {
        alert('请填写完整的配置参数');
        console.log('验证失败：必填字段不完整');
        return;
      }
      
      // 验证 formulaList
      if (!formulaList || formulaList.length === 0) {
        alert('请配置算数项');
        console.log('验证失败：formulaList 为空');
        return;
      }
      
      // 验证每个 formulaList 项
      for (const item of formulaList) {
        if (!item.min || !item.max || item.min > item.max) {
          alert('算数项的最小值必须小于或等于最大值');
          console.log('验证失败：算数项范围不正确', item);
          return;
        }
      }
      
      // 验证结果范围
      if (resultMinValue > resultMaxValue) {
        alert('运算结果的最小值必须小于或等于最大值');
        console.log('验证失败：结果范围不正确');
        return;
      }
      
      // 深拷贝配置数据
      const configToAdd = {
        step: parseInt(step),
        numberOfFormulas,
        whereIsResult: parseInt(whereIsResult),
        formulaList: JSON.parse(JSON.stringify(formulaList)),
        resultMinValue,
        resultMaxValue,
        numberMode: formData.numberMode,
        decimalPlaces: formData.numberMode === 'decimal' ? formData.decimalPlaces : null
      };
      
      console.log('要添加的配置:', configToAdd);
      const newPaperList = [...paperList, configToAdd];
      console.log('新的 paperList:', newPaperList);
      setPaperList(newPaperList);
      console.log('状态已更新');
      alert('成功添加配置');
    }
    
    console.log('append 函数执行完成');
  };

  const clear = () => {
    // 参考 PrimarySchoolMathematics 的实现，清空 paperList
    if (!confirm('确定要清空所有已添加的口算题吗？')) {
      return;
    }
    setPaperList([]);
    // 同时清空 formData.customFormulaList 以便保存
    setFormData({ ...formData, customFormulaList: [{ formula: '' }] });
  };

  const buildConfigData = () => ({
    step: parseInt(formData.step),
    numberOfFormulas: formData.numberOfFormulas,
    whereIsResult: parseInt(formData.whereIsResult),
    enableBrackets: formData.enableBrackets,
    carry: parseInt(formData.carry),
    abdication: parseInt(formData.abdication),
    remainder: parseInt(formData.remainder),
    solution: parseInt(formData.solution),
    numberOfPapers: formData.numberOfPapers,
    numberOfPagerColumns: formData.numberOfPagerColumns,
    paperTitle: formData.paperTitle,
    paperSubTitle: formData.paperSubTitle,
    fileNameGeneratedRule: formData.fileNameGeneratedRule,
    formulaList: JSON.stringify(formData.formulaList),
    resultMinValue: formData.resultMinValue,
    resultMaxValue: formData.resultMaxValue,
    generateMode: parseInt(formData.generateMode),
    numberMode: formData.numberMode,
    decimalPlaces: formData.numberMode === 'decimal' ? formData.decimalPlaces : null,
    customFormulaList: formData.customFormulaList.length > 0 ? JSON.stringify(formData.customFormulaList) : null,
    paperListData: paperList.length > 0 ? JSON.stringify(paperList) : null
  });

  // 保存当前参数到当前选中的配置（更新，不创建新的）
  const saveConfiguration = async () => {
    if (!activeConfigId) {
      alert('请先选择一个配置');
      return;
    }
    try {
      const response = await api.parents.updatePaperConfig(id!, activeConfigId, buildConfigData());
      await loadConfigs(id!, response.data.id);
      alert('保存成功！');
    } catch (error: any) {
      alert('保存失败：' + error.message);
    }
  };

  // 另存为新配置
  const addConfiguration = async () => {
    if (configs.length >= 10) {
      alert('最多只能保存10份配置！');
      return;
    }
    const configName = prompt('请给新配置起个名字（最多10个字符）');
    if (!configName || configName.length > 10) {
      alert('配置名字不能为空且不能多于10个字符');
      return;
    }
    try {
      const response = await api.parents.addPaperConfig(id!, {
        configName,
        ...buildConfigData()
      });
      await loadConfigs(id!, response.data.id);
      alert('另存为新配置成功！');
    } catch (error: any) {
      alert('保存失败：' + error.message);
    }
  };

  const selectConfig = async (configId: string) => {
    if (!confirm('确定加载吗？注意未保存的参数将会丢失！')) return;
    
    setActiveConfigId(configId);
    const config = configs.find(c => c.id === configId);
    if (config) {
      loadConfigData(config);
    }
  };

  const removeConfig = async (configId: string) => {
    if (!confirm('确定删除吗？')) return;

    try {
      await api.parents.deletePaperConfig(id!, configId);
      await loadConfigs(id!);
      if (activeConfigId === configId && configs.length > 0) {
        setActiveConfigId(configs[0].id);
      }
      alert('删除成功！');
    } catch (error: any) {
      alert('删除失败：' + error.message);
    }
  };

  const handleGeneratePaper = async (configId: string) => {
    // 检查打印数量是否少于每日练习频率
    if (formData.numberOfPapers < dailyFrequency) {
      const proceed = confirm(
        `当前每日练习频率为 ${dailyFrequency} 次，但您只设置了生成 ${formData.numberOfPapers} 份试卷。\n\n` +
        `这意味着孩子可能需要完成 ${dailyFrequency} 次练习，但只有 ${formData.numberOfPapers} 份纸质试卷可用。\n\n` +
        `注意：孩子在 App 中练习时会自动生成新的题目，不受打印数量限制。\n\n` +
        `是否继续生成 ${formData.numberOfPapers} 份试卷？`
      );
      if (!proceed) return;
    }

    try {
      setLoading(true);
      // 参考 PrimarySchoolMathematics 的逻辑，传递 paperList 给后端
      const response = await api.parents.generatePaper(id!, { configId, paperList });
      navigate(`/children/${id}/papers/${response.data.id}/print`);
    } catch (error: any) {
      alert('生成失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const parsedChinese = parseChineseText(chineseText);
  const sortedChineseConfigs = [...chineseConfigs].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => navigate('/dashboard')} className="text-blue-500 hover:text-blue-700">
            ← 返回
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex rounded-lg bg-white p-1 shadow">
          <button
            type="button"
            onClick={() => setActiveTab('math')}
            className={`flex-1 rounded-md px-4 py-3 font-bold transition ${activeTab === 'math' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            数学
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chinese')}
            className={`flex-1 rounded-md px-4 py-3 font-bold transition ${activeTab === 'chinese' ? 'bg-rose-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            语文
          </button>
        </div>

        {activeTab === 'math' ? (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：参数设置 */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-6">试卷配置</h2>

              {/* 生成模式 */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">生成模式</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, generateMode: '1' })}
                    className={`px-4 py-2 rounded ${formData.generateMode === '1' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    自动生成
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, generateMode: '2' })}
                    className={`px-4 py-2 rounded ${formData.generateMode === '2' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    手动添加
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 mb-2">运算模式</label>
                  <select
                    value={formData.numberMode}
                    onChange={(e) => setFormData({
                      ...formData,
                      numberMode: e.target.value === 'decimal' ? 'decimal' : 'integer'
                    })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="integer">整数模式</option>
                    <option value="decimal">小数模式</option>
                  </select>
                </div>
                {formData.numberMode === 'decimal' && (
                  <div>
                    <label className="block text-gray-700 mb-2">小数位数</label>
                    <select
                      value={formData.decimalPlaces}
                      onChange={(e) => setFormData({ ...formData, decimalPlaces: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value={1}>1 位</option>
                      <option value={2}>2 位</option>
                      <option value={3}>3 位</option>
                    </select>
                  </div>
                )}
              </div>

              {formData.generateMode === '1' && (
                <>
                  {/* 几步运算 */}
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">几步运算？</label>
                    <div className="flex gap-4 flex-wrap">
                      {stepOptions.map(option => (
                        <div key={option.key} className="flex flex-col">
                          <button
                            onClick={() => changeStep(option.key)}
                            disabled={option.disabled}
                            className={`px-4 py-2 rounded ${formData.step === option.key ? 'bg-blue-500 text-white' : 'bg-gray-200'} ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {option.label}
                          </button>
                          {option.disabled && (
                            <span className="text-xs text-red-500 mt-1">⚠️ 余数设置不支持</span>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setOptionsDrawerVisible(true)}
                        className="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        其他设置
                      </button>
                    </div>
                  </div>

                  {/* 算数项 */}
                  {formData.formulaList.map((item, index) => (
                    <div key={index} className="mb-6">
                      {item.operators && (
                        <div className="mb-2">
                          <label className="block text-gray-700 mb-2">第{index}步运算符号选择</label>
                          <div className="flex gap-4">
                            {operatorOptions.map(op => (
                              <label key={op.key} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={item.operators?.includes(op.key) || false}
                                  onChange={(e) => {
                                    const newOperators = e.target.checked
                                      ? [...(item.operators || []), op.key]
                                      : item.operators?.filter(o => o !== op.key) || [];
                                    const newFormulaList = [...formData.formulaList];
                                    newFormulaList[index].operators = newOperators;
                                    setFormData({ ...formData, formulaList: newFormulaList });
                                  }}
                                  className="mr-2"
                                />
                                {op.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2">算数项{index + 1}</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-600 mb-1">最小值</label>
                            <input
                              type="number"
                              value={item.min}
                              onChange={(e) => {
                                const newFormulaList = [...formData.formulaList];
                                newFormulaList[index].min = parseInt(e.target.value);
                                setFormData({ ...formData, formulaList: newFormulaList });
                              }}
                              className="w-full px-3 py-2 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 mb-1">最大值</label>
                            <input
                              type="number"
                              value={item.max}
                              onChange={(e) => {
                                const newFormulaList = [...formData.formulaList];
                                newFormulaList[index].max = parseInt(e.target.value);
                                setFormData({ ...formData, formulaList: newFormulaList });
                              }}
                              className="w-full px-3 py-2 border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 运算结果 */}
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">运算结果</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-600 mb-1">最小值</label>
                        <input
                          type="number"
                          value={formData.resultMinValue}
                          onChange={(e) => setFormData({ ...formData, resultMinValue: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1">最大值</label>
                        <input
                          type="number"
                          value={formData.resultMaxValue}
                          onChange={(e) => setFormData({ ...formData, resultMaxValue: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 题目数量 */}
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">题目数量</label>
                    <input
                      type="number"
                      value={formData.numberOfFormulas}
                      onChange={(e) => setFormData({ ...formData, numberOfFormulas: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </>
              )}

              {formData.generateMode === '2' && (
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">手动添加题目</label>
                  {formData.customFormulaList.map((item, index) => (
                    <div key={index} className="mb-2">
                      <input
                        type="text"
                        value={item.formula}
                        onChange={(e) => {
                          const newCustomList = [...formData.customFormulaList];
                          newCustomList[index].formula = e.target.value;
                          setFormData({ ...formData, customFormulaList: newCustomList });
                        }}
                        placeholder="例如：1+1="
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData({ ...formData, customFormulaList: [...formData.customFormulaList, { formula: '' }] })}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    + 添加题目
                  </button>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <button onClick={append} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  添加题目
                </button>
                <button onClick={clear} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                  清空题目
                </button>
                <button onClick={saveConfiguration} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                  保存当前配置
                </button>
                <button onClick={addConfiguration} className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition">
                  另存为新配置
                </button>
                <button
                  onClick={() => handleGeneratePaper(activeConfigId)}
                  disabled={loading || !activeConfigId || paperList.length === 0}
                  className={`bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 transition flex items-center gap-2 ${(!activeConfigId || loading || paperList.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? '生成中...' : '🖨️ 立即生成并预览试卷'}
                </button>
              </div>

              {/* 显示已添加的口算题 */}
              {paperList.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-bold mb-3">当前题目包含的内容 ({paperList.length} 份)</h3>
                  <div className="space-y-2">
                    {paperList.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        {item.customFormulaList ? (
                          <div>
                            <p className="font-medium">手动添加模式</p>
                            <p className="text-sm text-gray-600">题目数量: {item.numberOfFormulas}</p>
                            <p className="text-sm text-gray-600">
                              题型: {item.numberMode === 'decimal' ? `小数题（${item.decimalPlaces}位）` : '整数题'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">自动生成模式 - {item.step}步运算</p>
                            <p className="text-sm text-gray-600">题目数量: {item.numberOfFormulas} | 结果范围: {item.resultMinValue}-{item.resultMaxValue}</p>
                            <p className="text-sm text-gray-600">
                              题型: {item.numberMode === 'decimal' ? `小数题（${item.decimalPlaces}位）` : '整数题'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：配置列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">已保存配置列表</h2>
                <button onClick={resetToDefault} className="text-red-500 text-sm hover:text-red-700">
                  重置配置
                </button>
              </div>

              {configs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">还没有配置</p>
              ) : (
                <div className="space-y-3">
                  {configs.map(config => (
                    <div
                      key={config.id}
                      className={`p-4 rounded border-2 transition ${activeConfigId === config.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 cursor-pointer'}`}
                      onClick={() => selectConfig(config.id)}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold">{config.configName}</p>
                        <div className="flex gap-2">
                          {!config.isDefault && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeConfig(config.id); }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {config.isDefault && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">默认</span>
                        )}
                        {config.isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">当前使用中</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 其他设置抽屉 */}
        {optionsDrawerVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setOptionsDrawerVisible(false)}>
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">其他设置</h3>
                <button
                  onClick={() => setOptionsDrawerVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">题型设置</label>
                  <select
                    value={formData.whereIsResult}
                    onChange={(e) => setFormData({ ...formData, whereIsResult: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {whereIsResultOptions.map(option => (
                      <option key={option.key} value={option.key} disabled={option.disabled}>
                        {option.label}{option.disabled && ' (余数设置不支持)'}
                      </option>
                    ))}
                  </select>
                  {formData.whereIsResult === '1' && formData.remainder === '3' && (
                    <p className="text-xs text-red-500 mt-1">⚠️ 余数设置为"结果余数"时，不能选择"求算数项"</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableBrackets}
                      onChange={(e) => setFormData({ ...formData, enableBrackets: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">启用括号()</span>
                  </label>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">加法设置</label>
                  <select
                    value={formData.carry}
                    onChange={(e) => setFormData({ ...formData, carry: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="1">随机进位</option>
                    <option value="2">加法进位</option>
                    <option value="3">没有进位</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">减法设置</label>
                  <select
                    value={formData.abdication}
                    onChange={(e) => setFormData({ ...formData, abdication: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="1">随机退位</option>
                    <option value="2">减法退位</option>
                    <option value="3">没有退位</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">除法设置</label>
                  <select
                    value={formData.remainder}
                    onChange={(e) => setFormData({ ...formData, remainder: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {remainderOptions.map(option => (
                      <option key={option.key} value={option.key} disabled={option.disabled}>
                        {option.label}{option.disabled && ' (不支持)'}
                      </option>
                    ))}
                  </select>
                  {formData.remainder === '3' && (
                    <p className="text-xs text-red-500 mt-1">⚠️ 结果余数不支持多步运算或求算数项</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">小数模式说明</label>
                  <div className="text-sm text-gray-600 leading-6 bg-gray-50 border rounded p-3">
                    <p>开启后，自动生成题目和手动添加题目都会按所选小数位数进行处理。</p>
                    <p>整数模式下会忽略小数位数配置。</p>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">解题方式</label>
                  <select
                    value={formData.solution}
                    onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="0">用口算解题</option>
                    <option value="1">用竖式解题</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      生成的卷子数量
                      <span className="text-xs text-gray-500 block">仅控制"预览打印"时的试卷份数</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.numberOfPapers}
                      onChange={(e) => setFormData({ ...formData, numberOfPapers: parseInt(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded ${formData.numberOfPapers < dailyFrequency ? 'border-yellow-500 bg-yellow-50' : ''}`}
                    />
                    {formData.numberOfPapers < dailyFrequency && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ 当前每日练习频率为 {dailyFrequency} 次，建议打印至少 {dailyFrequency} 份试卷
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">口算题列数</label>
                    <input
                      type="number"
                      value={formData.numberOfPagerColumns}
                      onChange={(e) => setFormData({ ...formData, numberOfPagerColumns: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">卷子标题</label>
                  <input
                    type="text"
                    value={formData.paperTitle}
                    onChange={(e) => setFormData({ ...formData, paperTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">卷子副标题</label>
                  <input
                    type="text"
                    value={formData.paperSubTitle}
                    onChange={(e) => setFormData({ ...formData, paperSubTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">文件名生成规则</label>
                  <select
                    value={formData.fileNameGeneratedRule}
                    onChange={(e) => setFormData({ ...formData, fileNameGeneratedRule: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="baseOnTitleAndIndex">卷子标题+时间</option>
                    <option value="baseOnIndexOnly">仅时间</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        )}
        </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg bg-white p-6 shadow">
              <div>
                <h2 className="text-xl font-bold text-gray-900">语文词表</h2>
                <p className="mt-1 text-sm text-gray-500">第一位为孩子当前练习使用的词表。</p>
              </div>
              <button
                type="button"
                onClick={openCreateChineseModal}
                className="rounded bg-rose-500 px-5 py-2 font-bold text-white hover:bg-rose-600"
              >
                新建词表
              </button>
            </div>

            {chineseModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
              <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl [&>div:nth-of-type(2)]:hidden [&>div:nth-of-type(3)]:hidden">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{editingChineseConfig ? '修改词表' : '新建词表'}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-600">看拼音写汉字</span>
                    <button
                      type="button"
                      onClick={closeChineseModal}
                      className="rounded border bg-white px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      关闭
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-gray-700">每日词语数量</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={chineseDailyCount}
                    onChange={(event) => setChineseDailyCount(Number(event.target.value))}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-gray-700">词表</label>
                  <textarea
                    value={chineseText}
                    onChange={(event) => setChineseText(event.target.value)}
                    rows={14}
                    placeholder={'dōng tiān=冬天\nhú zi=胡子\nqíng tiān=晴天\nmíng tiān=明天'}
                    className="w-full rounded border px-3 py-2 font-mono text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">支持带声调或不带声调拼音。空行会自动忽略。</p>
                </div>

                <div className="mb-6 rounded-xl border bg-rose-50/40 p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-gray-900">拼音汉字录入</h3>
                    <button
                      type="button"
                      onClick={addChineseItem}
                      className="rounded bg-rose-500 px-6 py-2 font-bold text-white hover:bg-rose-600"
                    >
                      确认添加
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
                    <div className="rounded-lg border bg-white p-4">
                      <h4 className="mb-4 text-center text-base font-bold text-gray-800">拼音</h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto]">
                          <div
                            className="flex h-14 min-w-0 items-center overflow-x-auto whitespace-nowrap rounded-lg border border-gray-200 bg-gray-50 px-4 text-2xl font-black text-gray-700 shadow-inner"
                            style={{ fontFamily: '"KaiTi", "STKaiti", "Noto Sans SC", cursive' }}
                          >
                            {confirmedPinyin || <span className="text-base text-gray-300">确认后的拼音会显示在这里</span>}
                          </div>
                          <button
                            type="button"
                            onClick={deletePinyinResult}
                            disabled={pinyinResult.length === 0}
                            className="rounded border bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                          >
                            删除
                          </button>
                        </div>

                        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_auto]">
                          <div
                            className="flex h-16 items-center justify-center rounded-lg border-2 border-rose-200 bg-white px-4 text-4xl font-black text-rose-600 ring-4 ring-rose-50"
                            style={{ fontFamily: '"KaiTi", "STKaiti", "Noto Sans SC", cursive' }}
                          >
                            {currentPinyin || <span className="text-lg text-gray-300">点击拼音按钮</span>}
                          </div>
                          <button
                            type="button"
                            onClick={confirmCurrentPinyin}
                            disabled={!currentPinyin}
                            className="rounded bg-rose-500 px-4 py-2 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            确认
                          </button>
                          <button
                            type="button"
                            onClick={deletePinyinInput}
                            disabled={!currentPinyinInput}
                            className="rounded border bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-4">
                      <label className="mb-4 block text-center text-base font-bold text-gray-800">汉字</label>
                      <input
                        type="text"
                        value={currentAnswer}
                        onChange={(event) => setCurrentAnswer(event.target.value)}
                        placeholder="输入汉字"
                        className="h-28 w-full rounded border px-4 text-center text-5xl font-bold"
                      />
                      <div className="mt-3 flex min-h-10 flex-wrap justify-center gap-2">
                        {currentCandidates.map((candidate) => (
                          <button
                            key={candidate}
                            type="button"
                            onClick={() => setCurrentAnswer((value) => `${value}${candidate}`)}
                            className="rounded border bg-white px-3 py-1.5 text-lg font-bold text-gray-800 hover:border-rose-400 hover:bg-rose-50"
                          >
                            {candidate}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 space-y-5 [&>button]:hidden [&>div:nth-of-type(4)]:hidden">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="font-bold text-gray-700">声母</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PINYIN_INITIALS.map((initial) => (
                        <button
                          key={initial}
                          type="button"
                          onClick={() => appendPinyinInput(initial)}
                          className="rounded border bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                          {initial}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-bold text-gray-700">韵母</label>
                    <div className="flex flex-wrap gap-2">
                      {PINYIN_FINALS.map((final) => (
                        <button
                          key={final}
                          type="button"
                          onClick={() => appendPinyinInput(final)}
                          className="rounded border bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                          {final}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-bold text-gray-700">音调</label>
                    <div className="flex flex-wrap gap-2">
                      {PINYIN_TONES.map((tone) => (
                        <button
                          key={tone.value}
                          type="button"
                          onClick={() => setCurrentTone(tone.value)}
                          className="rounded border bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                          {tone.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-bold text-gray-700">汉字</label>
                    <input
                      type="text"
                      value={currentAnswer}
                      onChange={(event) => setCurrentAnswer(event.target.value)}
                      placeholder="输入汉字，或从下方候选中选择"
                      className="w-full rounded border px-3 py-2"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentCandidates.length > 0 ? currentCandidates.map((candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => setCurrentAnswer((value) => `${value}${candidate}`)}
                          className="rounded border bg-gray-50 px-3 py-1.5 text-lg font-bold text-gray-800 hover:border-rose-400 hover:bg-rose-50"
                        >
                          {candidate}
                        </button>
                      )) : (
                        <span className="text-sm text-gray-500">暂无候选，可直接打字输入。</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addChineseItem}
                    className="rounded bg-rose-500 px-6 py-2 font-bold text-white hover:bg-rose-600"
                  >
                    确认添加到词表
                  </button>
                </div>

                <div className="mb-6 rounded-lg border bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-gray-800">预览</h4>
                    <span className="text-sm text-gray-500">{parsedChinese.items.length} 条</span>
                  </div>
                  {parsedChinese.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">添加拼音和汉字后，会在这里预览。</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {parsedChinese.items.map((item, index) => (
                        <div key={`${item.pinyin}-${item.answer}-${index}`} className="flex items-center justify-between gap-3 rounded border bg-gray-50 px-3 py-2">
                          <div>
                            <p className="text-sm text-gray-500">{item.pinyin}</p>
                            <p className="text-lg font-bold text-gray-900">{item.answer}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeChineseItem(index)}
                            className="rounded bg-white px-2 py-1 text-sm font-bold text-red-500 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {parsedChinese.errors.length > 0 && (
                  <div className="mb-6 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {parsedChinese.errors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                <button
                  onClick={saveChineseConfig}
                  disabled={savingChinese}
                  className="w-full rounded bg-rose-500 px-6 py-2 font-bold text-white hover:bg-rose-600 disabled:bg-gray-400"
                >
                  {savingChinese ? '保存中...' : '保存词表'}
                </button>
              </div>
            </div>
            )}

            <div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">已保存词表</h2>
                  <span className="text-sm text-gray-500">{sortedChineseConfigs.length} 个</span>
                </div>

                {sortedChineseConfigs.length === 0 ? (
                  <p className="py-6 text-center text-gray-500">还没有保存词表</p>
                ) : (
                  <div className="max-h-[620px] space-y-3 overflow-y-auto">
                    {sortedChineseConfigs.map((config, index) => (
                      <div
                        key={config.id}
                        onClick={() => {
                          if (!config.isActive) {
                            setActiveChineseConfig(config.id);
                          }
                        }}
                        className={`relative rounded border p-3 transition ${config.isActive ? 'border-green-300 bg-green-50' : 'cursor-pointer bg-gray-50 hover:border-rose-300'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="text-lg font-bold text-gray-900">词表{index + 1}</p>
                            </div>
                            <p className="text-sm text-gray-500">{config.items.length} 个词语</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {config.items.slice(0, 4).map((item, itemIndex) => (
                                <span key={`${config.id}-${item.pinyin}-${item.answer}-${itemIndex}`} className="rounded bg-white px-2 py-0.5 text-xs text-gray-600">
                                  {item.answer}
                                </span>
                              ))}
                              {config.items.length > 4 && (
                                <span className="rounded bg-white px-2 py-0.5 text-xs text-gray-500">+{config.items.length - 4}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditChineseModal(config);
                              }}
                              className="rounded bg-white px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-100"
                            >
                              修改
                            </button>
                            {!config.isActive && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveChineseConfig(config.id);
                                }}
                                className="rounded bg-rose-500 px-3 py-1 text-sm font-bold text-white hover:bg-rose-600"
                              >
                                使用
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteChineseConfig(config.id);
                              }}
                              className="rounded bg-white px-3 py-1 text-sm font-bold text-red-500 hover:bg-red-50"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        {config.isActive && (
                          <span className="absolute bottom-2 right-3 rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">使用中</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={saveChineseConfig}
                  disabled={savingChinese}
                  className="hidden"
                >
                  {savingChinese ? '保存中...' : '保存为新词表'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperConfig;
