'use client'; // Next.js App Router 必须声明为客户端组件

import React, { useEffect, useRef, useState } from 'react';

export default function RhythmGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI 状态
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.5);

  // 使用 ref 同步状态给 Canvas 的 requestAnimationFrame 循环使用
  // 避免闭包陷阱，保证 render 函数里能读到最新的 isPlaying 和 speed
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 游戏核心数据（不使用 useState，避免触发不必要的 React 渲染）
    let time = 0;
    let lastTimestamp = performance.now();
    const notes: { lane: number; time: number }[] = [];
    const hitEffects: { lane: number; time: number; duration: number }[] =[];
    const keyMap: Record<string, number> = { d: 0, f: 1, j: 2, k: 3 };
    const keyState: Record<number, boolean> = { 0: false, 1: false, 2: false, 3: false };

    const laneWidth = 90;
    let startX = 0;
    let judgeY = 0;
    let animationFrameId: number;

    // 尺寸适配
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      startX = (window.innerWidth - laneWidth * 4) / 2;
      judgeY = window.innerHeight * 0.8;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 键盘按下
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p') {
        setIsPlaying((prev) => !prev);
        return;
      }
      if (keyMap[key] !== undefined && !keyState[keyMap[key]]) {
        const lane = keyMap[key];
        keyState[lane] = true;
        if (isPlayingRef.current) {
          notes.push({ lane, time });
          hitEffects.push({ lane, time, duration: 300 });
        }
      }
    };

    // 键盘抬起
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (keyMap[key] !== undefined) {
        keyState[keyMap[key]] = false;
      }
    };

    // 鼠标滚轮看谱
    const handleWheel = (e: WheelEvent) => {
      if (!isPlayingRef.current) {
        time += e.deltaY * 1.5;
        if (time < 0) time = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);

    // 核心渲染循环
    const render = (timestamp: number) => {
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (isPlayingRef.current) {
        time += delta;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. 轨道背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(startX, 0, laneWidth * 4, window.innerHeight);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(startX + i * laneWidth, 0);
        ctx.lineTo(startX + i * laneWidth, window.innerHeight);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      const keysDisplay =['D', 'F', 'J', 'K'];
      for (let i = 0; i < 4; i++) {
        ctx.fillText(keysDisplay[i], startX + i * laneWidth + laneWidth / 2, judgeY + 40);
      }

      // PAUSED 浮水印
      if (!isPlayingRef.current) {
        ctx.fillStyle = 'rgba(76, 232, 247, 0.15)';
        ctx.font = 'bold 64px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', window.innerWidth / 2, window.innerHeight / 2);
      }

      // 2. 判定线
      ctx.beginPath();
      ctx.moveTo(startX - 40, judgeY);
      ctx.lineTo(startX + laneWidth * 4 + 40, judgeY);
      ctx.strokeStyle = '#4CE8F7';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#4CE8F7';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. 绘制音符
      for (let note of notes) {
        const noteY = judgeY - (time - note.time) * speedRef.current;
        if (noteY > -50 && noteY < window.innerHeight + 50) {
          const noteX = startX + note.lane * laneWidth;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#4CE8F7';
          ctx.fillStyle = '#4CE8F7';
          ctx.fillRect(noteX + 4, noteY - 8, laneWidth - 8, 16);
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(noteX + 4, noteY - 3, laneWidth - 8, 6);
        }
      }

      // 4. 按压反馈
      for (let i = 0; i < 4; i++) {
        if (keyState[i]) {
          const gradient = ctx.createLinearGradient(0, judgeY - 200, 0, judgeY);
          gradient.addColorStop(0, 'rgba(76, 232, 247, 0)');
          gradient.addColorStop(1, 'rgba(76, 232, 247, 0.25)');
          ctx.fillStyle = gradient;
          ctx.fillRect(startX + i * laneWidth, judgeY - 200, laneWidth, 200);
        }
      }

      // 5. 点击特效
      for (let i = hitEffects.length - 1; i >= 0; i--) {
        const effect = hitEffects[i];
        const age = time - effect.time;
        if (age > effect.duration) {
          hitEffects.splice(i, 1);
          continue;
        }
        const progress = age / effect.duration;
        const alpha = 1 - progress;
        const expandWidth = laneWidth + progress * 20;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        const effX = startX + effect.lane * laneWidth + laneWidth / 2 - expandWidth / 2;
        ctx.fillRect(effX, judgeY - 2, expandWidth, 4);

        ctx.fillStyle = `rgba(76, 232, 247, ${alpha * 0.5})`;
        ctx.fillRect(effX + 4, judgeY - 30 * progress, expandWidth - 8, 30 * progress);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // 清理函数：组件卸载时移除监听器并停止动画，防止内存泄漏
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationFrameId);
    };
  },[]);

  return (
    // fixed inset-0 确保组件铺满全屏，不会受到博客已有 padding/margin 影响
    <div className="fixed inset-0 bg-[#121315] overflow-hidden font-sans text-white z-50">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* 暂停 UI (使用 Tailwind 样式) */}
      {!isPlaying && (
        <div className="absolute top-10 right-10 bg-[#141419]/60 backdrop-blur-md p-6 rounded-xl border border-[#4CE8F7]/50 shadow-[0_0_20px_rgba(76,232,247,0.15)] w-72 pointer-events-auto">
          <h2 className="m-0 mb-5 text-[#4CE8F7] font-normal text-xl tracking-widest">
            SETTINGS
          </h2>
          
          <div className="my-5 text-left">
            <label className="flex justify-between text-sm text-gray-300 mb-3">
              <span>轨道流速</span>
              <span>{speed.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-[#4CE8F7] cursor-pointer"
            />
          </div>
          
          <div className="text-xs text-gray-400 leading-relaxed mt-5 pt-4 border-t border-white/10">
            <p>上下滚动滚轮：查看时间轴</p>
            <p className="mt-1">
              按下 <span className="text-[#4CE8F7] font-bold">P</span> 键恢复运行
            </p>
          </div>
        </div>
      )}
    </div>
  );
}