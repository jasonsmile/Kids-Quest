import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

export const PracticeConfig: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dailyFrequency, setDailyFrequency] = useState(1);
  const [isEnabled, setIsEnabled] = useState(true);
  const [chineseEnabled, setChineseEnabled] = useState(false);
  const [chineseDailyCount, setChineseDailyCount] = useState(10);
  const [chineseItemCount, setChineseItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingMath, setSavingMath] = useState(false);
  const [savingChinese, setSavingChinese] = useState(false);

  useEffect(() => {
    if (id) loadConfig(id);
  }, [id]);

  const loadConfig = async (childId: string) => {
    try {
      const [mathResponse, chineseResponse] = await Promise.all([
        api.parents.getPracticeConfig(childId),
        api.parents.getChineseConfig(childId),
      ]);

      const mathConfig = mathResponse.data;
      if (mathConfig) {
        setDailyFrequency(mathConfig.dailyFrequency || 1);
        setIsEnabled(mathConfig.isEnabled !== undefined ? mathConfig.isEnabled : true);
      }

      const chineseConfig = chineseResponse.data;
      if (chineseConfig) {
        setChineseEnabled(Boolean(chineseConfig.isEnabled));
        setChineseDailyCount(chineseConfig.dailyCount || 10);
        setChineseItemCount((chineseConfig.items || []).length);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMath = async () => {
    if (!id) return;
    try {
      setSavingMath(true);
      await api.parents.updatePracticeConfig(id, {
        dailyFrequency,
        isEnabled,
      });
      alert('数学练习配置已保存');
    } catch (error: any) {
      alert(`保存失败：${error.message}`);
    } finally {
      setSavingMath(false);
    }
  };

  const handleSaveChinese = async () => {
    if (!id) return;
    if (chineseEnabled && chineseItemCount === 0) {
      alert('启用语文练习前，请先到试卷配置的“语文”中维护词表');
      return;
    }

    try {
      setSavingChinese(true);
      await api.parents.updateChineseConfig(id, {
        isEnabled: chineseEnabled,
        dailyCount: chineseDailyCount,
      });
      alert('语文练习配置已保存');
    } catch (error: any) {
      alert(`保存失败：${error.message}`);
    } finally {
      setSavingChinese(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <button onClick={() => navigate('/dashboard')} className="text-blue-500 hover:text-blue-700">
            返回
          </button>
          <h1 className="text-xl font-bold text-gray-800">练习配置</h1>
          <div className="w-10" />
        </div>
      </nav>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">数学练习</h2>
              <p className="mt-1 text-sm text-gray-500">设置孩子每天最多进行几次数学练习。</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">数学</span>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-gray-700">每日练习频率（次）</label>
              <input
                type="number"
                min="1"
                max="10"
                value={dailyFrequency}
                onChange={(event) => setDailyFrequency(Number(event.target.value))}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
              />
              <span className="text-gray-700">启用每日数学练习</span>
            </label>

            <button
              onClick={handleSaveMath}
              disabled={savingMath}
              className="w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:bg-gray-400"
            >
              {savingMath ? '保存中...' : '保存数学练习配置'}
            </button>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">语文练习</h2>
              <p className="mt-1 text-sm text-gray-500">设置是否启用每日语文练习，以及每天练几个词。</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-600">语文</span>
          </div>

          <div className="space-y-6">
            <div>
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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chineseEnabled}
                onChange={(event) => setChineseEnabled(event.target.checked)}
              />
              <span className="text-gray-700">启用每日语文练习</span>
            </label>

            <button
              onClick={handleSaveChinese}
              disabled={savingChinese}
              className="w-full rounded bg-rose-500 px-4 py-2 font-bold text-white hover:bg-rose-600 disabled:bg-gray-400"
            >
              {savingChinese ? '保存中...' : '保存语文练习配置'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
