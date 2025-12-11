import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  // 原有图标保持或合并
  ClipboardList, Settings2, MessageSquare, Zap, AlertTriangle, CheckCircle2, PlayCircle,
  Timer, ChevronDown, Sparkles, LayoutDashboard, PenTool, Search, ArrowRight, User,
  Phone, MapPin, Package, CreditCard, Tag, History, Sliders, Power, ArrowLeft, RotateCcw,
  Check, Clock, MoreHorizontal,
  // 新增/更新的图标
  Move, Save, X, Plus, Link as LinkIcon, ExternalLink, Trash2, MousePointer2,
  GitCommit, Circle
} from "lucide-react";

// ==========================================
// 0. 全局样式 & 动画
// ==========================================
const GlobalStyles = () => (
  <style>{`
    @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeInUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-slide-in-right { animation: slideInRight 0.4s ease-out forwards; }
    .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    /* 画布背景网格 */
    .canvas-grid {
      background-size: 20px 20px;
      background-image:
        linear-gradient(to right, #e2e8f0 1px, transparent 1px),
        linear-gradient(to bottom, #e2e8f0 1px, transparent 1px);
    }
  `}</style>
);

// ==========================================
// 1. 初始数据 (图结构化)
// ==========================================
const INITIAL_NODES = [
  {
    id: "retention",
    type: "interaction",
    position: { x: 100, y: 100 },
    data: {
      title: "尝试挽留客户",
      desc: "前置逻辑：尝试赠送权益以保留客户。",
      script: "亲，非常遗憾您想退款。我们近期上线了会员专属权益，特地为您申请免费体验一个月，您看要不要再试用一下？",
      links: [
        { title: "会员权益说明书", url: "#" },
        { title: "挽留话术技巧Wiki", url: "#" }
      ]
    }
  },
  {
    id: "wait_script",
    type: "interaction",
    position: { x: 100, y: 300 },
    data: {
      title: "请客户稍候",
      desc: "需查询后台数据，请先发送礼貌等待语。",
      script: "好的，请您稍等片刻，我马上为您核实账户详情。",
      links: []
    }
  },
  {
    id: "auto_check",
    type: "system",
    position: { x: 100, y: 450 },
    data: {
      title: "系统自动核查",
      desc: "正在调用 API 获取账户冻结状态...",
      script: "",
      links: []
    }
  },
  {
    id: "check_duration",
    type: "logic",
    position: { x: 400, y: 450 },
    data: {
      title: "确认开通时长",
      desc: "账户正常。请查询 CRM 确认开通天数。",
      script: "",
      links: [{ title: "退款规则大全", url: "#" }]
    }
  },
  {
    id: "check_coupon",
    type: "logic",
    position: { x: 400, y: 600 },
    data: {
      title: "确认优惠券",
      desc: "时长合规。请核实是否消耗了优惠券。",
      script: "",
      links: []
    }
  },
  {
    id: "confirmation",
    type: "interaction",
    position: { x: 700, y: 525 },
    data: {
      title: "最终方案确认",
      desc: "根据黑板数据，系统生成最终方案。",
      script: "（动态生成的确认话术）",
      links: []
    }
  },
  {
    id: "complaint",
    type: "alert",
    position: { x: 800, y: 100 },
    data: {
      title: "异常：投诉安抚",
      desc: "触发投诉预警，优先进行安抚。",
      script: "非常抱歉给您带来不好的体验，请您消消气。考虑到您的特殊情况，我这边为您申请加急特殊处理通道。",
      links: [{ title: "重大投诉处理SOP", url: "#" }]
    }
  }
];

// 简单的连接关系，用于画布渲染箭头
const INITIAL_EDGES = [
  { source: "retention", target: "wait_script" },
  { source: "wait_script", target: "auto_check" },
  { source: "auto_check", target: "check_duration" },
  { source: "check_duration", target: "check_coupon" },
  { source: "check_coupon", target: "confirmation" },
  { source: "check_duration", target: "confirmation" }, // 分支演示
];

// ==========================================
// 2. 辅助组件
// ==========================================
function UserProfilePanel() {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto shrink-0 z-10 shadow-sm hidden md:flex">
      <div className="p-8 border-b border-gray-100 flex flex-col items-center bg-gradient-to-b from-slate-50 to-white">
        <div className="w-24 h-24 bg-white border-4 border-white rounded-full flex items-center justify-center mb-4 shadow-lg relative">
          <User size={48} className="text-slate-400" />
          <span className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">王美玲</h2>
        <div className="flex gap-2 mt-3">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full flex items-center">
            <Sparkles size={12} className="mr-1 fill-yellow-700" /> SVIP 3
          </span>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">基本资料</h3>
          <div className="space-y-4 text-sm text-gray-600 font-medium">
            <div className="flex items-center"><Phone size={16} className="mr-3 text-gray-400" /><span>138 **** 8888</span></div>
            <div className="flex items-center"><MapPin size={16} className="mr-3 text-gray-400" /><span>上海市 浦东新区...</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. 后台配置模块 (Visual Canvas Editor)
// ==========================================
const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

// 简单的 ID 生成器
const generateId = (prefix = "node") => `${prefix}_${Date.now().toString(36)}`;

function AdminCanvas({ nodes, edges, setNodes, setEdges, onSave }) {
  // 状态管理
  const [selectedElement, setSelectedElement] = useState(null); // { type: 'node' | 'edge', id: string }
  const [draggingNode, setDraggingNode] = useState(null);
  const [connectingSourceId, setConnectingSourceId] = useState(null); // 当前正在拉线的源节点ID
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // 鼠标实时位置（用于绘制临时连线）
  const canvasRef = useRef(null);

  // --- 1. 节点操作逻辑 ---

  const addNode = (type) => {
    const startX = 50 + Math.random() * 50;
    const startY = 50 + Math.random() * 50;
    
    const newNode = {
      id: generateId(type),
      type: type, // 'interaction', 'system', 'logic', 'alert'
      position: { x: startX, y: startY },
      data: {
        title: type === 'interaction' ? "新交互节点" : type === 'logic' ? "新逻辑判断" : "新系统操作",
        desc: "请编辑节点描述...",
        script: "",
        links: []
      }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedElement({ type: 'node', id: newNode.id });
  };

  const deleteSelected = useCallback(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'node') {
      // 删除节点时，必须同时删除连接该节点的所有线
      setNodes(prev => prev.filter(n => n.id !== selectedElement.id));
      setEdges(prev => prev.filter(e => e.source !== selectedElement.id && e.target !== selectedElement.id));
    } else if (selectedElement.type === 'edge') {
      // 这里的 edge 删除逻辑主要靠点击删除按钮，但也支持一下逻辑完整性
    }
    setSelectedElement(null);
  }, [selectedElement, setNodes, setEdges]);

  // 监听键盘删除键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // 如果焦点在输入框内，不触发删除
        if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

  // 拖拽节点开始
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation(); // 阻止 MouseDown 冒泡
    // 如果点击的是连接桩(handle)，不要触发节点拖拽
    if (e.target.dataset.handle) return;

    setSelectedElement({ type: 'node', id: nodeId });
    const node = nodes.find(n => n.id === nodeId);
    setDraggingNode({
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { ...node.position }
    });
  };

  // --- 2. 连线操作逻辑 ---

  // 开始连线 (点击源节点的右侧红点)
  const startConnection = (e, nodeId) => {
    e.stopPropagation();
    e.preventDefault(); // 防止选中文本
    setConnectingSourceId(nodeId);
    
    // 计算初始鼠标位置相对于画布
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // 结束连线 (在目标节点上松开鼠标)
  const endConnection = (e, targetNodeId) => {
    e.stopPropagation();
    if (!connectingSourceId) return;
    if (connectingSourceId === targetNodeId) return; // 不允许自连

    // 检查是否已经存在连接
    const exists = edges.some(edge => edge.source === connectingSourceId && edge.target === targetNodeId);
    if (!exists) {
      setEdges(prev => [...prev, { source: connectingSourceId, target: targetNodeId }]);
    }
    setConnectingSourceId(null);
  };

  // 删除连线
  const deleteEdge = (edgeIndex) => {
    setEdges(prev => prev.filter((_, idx) => idx !== edgeIndex));
    setSelectedElement(null);
  };

  // --- 3. 全局鼠标事件 ---

  const handleGlobalMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 更新连线拖拽的终点
    if (connectingSourceId) {
      setMousePos({ x, y });
    }

    // 更新节点拖拽的位置
    if (draggingNode) {
      const dx = e.clientX - draggingNode.startX;
      const dy = e.clientY - draggingNode.startY;
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNode.id) {
          return {
            ...n,
            position: {
              x: draggingNode.initialPos.x + dx,
              y: draggingNode.initialPos.y + dy
            }
          };
        }
        return n;
      }));
    }
  };

  const handleGlobalMouseUp = () => {
    setDraggingNode(null);
    setConnectingSourceId(null); // 如果在空地松开，取消连线
  };

  // --- 4. 辅助渲染 ---

  const getEdgePath = (sx, sy, tx, ty) => {
    const midX = (sx + tx) / 2;
    return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
  };

  const selectedNode = selectedElement?.type === 'node' ? nodes.find(n => n.id === selectedElement.id) : null;

  const updateNodeData = (key, value) => {
    if (!selectedNode) return;
    setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: value } } : n));
  };
  
  const updateLink = (idx, field, val) => {
     if (!selectedNode) return;
     const newLinks = [...selectedNode.data.links];
     newLinks[idx] = { ...newLinks[idx], [field]: val };
     updateNodeData('links', newLinks);
  };

  return (
    <div 
      className="flex h-full w-full bg-slate-100 relative overflow-hidden" 
      onMouseMove={handleGlobalMouseMove} 
      onMouseUp={handleGlobalMouseUp}
    >
      {/* 1. 左侧工具栏 */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">组件库</span>
          <button onClick={() => addNode('interaction')} className="w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded flex items-center justify-center transition-colors" title="添加交互节点">
            <MessageSquare size={20} />
          </button>
          <button onClick={() => addNode('logic')} className="w-10 h-10 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded flex items-center justify-center transition-colors" title="添加逻辑节点">
            <GitCommit size={20} />
          </button>
          <button onClick={() => addNode('system')} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center transition-colors" title="添加系统节点">
            <Zap size={20} />
          </button>
          <button onClick={() => addNode('alert')} className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded flex items-center justify-center transition-colors" title="添加告警节点">
            <AlertTriangle size={20} />
          </button>
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col gap-2">
           <button onClick={deleteSelected} disabled={!selectedElement} className="w-10 h-10 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-100 rounded flex items-center justify-center transition-colors disabled:opacity-50" title="删除选中">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* 2. 主画布区域 */}
      <div 
        className="flex-1 relative overflow-hidden canvas-grid cursor-grab active:cursor-grabbing" 
        ref={canvasRef}
        onClick={() => setSelectedElement(null)} // 点击空白处取消选择
      >
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
            </marker>
             <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>

          {/* 渲染连线 */}
          {edges.map((edge, idx) => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            if (!source || !target) return null;
            
            const sx = source.position.x + NODE_WIDTH;
            const sy = source.position.y + NODE_HEIGHT / 2;
            const tx = target.position.x;
            const ty = target.position.y + NODE_HEIGHT / 2;
            const path = getEdgePath(sx, sy, tx, ty);
            const midX = (sx + tx) / 2;

            const t = 0.5;
            const bezierX = (1-t)*(1-t)*sx + 2*(1-t)*t*midX + t*t*tx; 
            const bezierY = (1-t)*(1-t)*sy + 2*(1-t)*t*sy + t*t*ty; 

            return (
              <g key={`${edge.source}-${edge.target}`} className="group pointer-events-auto">
                <path
                  d={path}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="transition-colors group-hover:stroke-blue-400 group-hover:stroke-[3px]"
                />
                <foreignObject x={bezierX - 10} y={bezierY - 10} width="20" height="20" className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={(e) => { e.stopPropagation(); deleteEdge(idx); }}
                     className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110"
                   >
                     <X size={12} />
                   </button>
                </foreignObject>
              </g>
            );
          })}

          {/* 渲染临时连线 */}
          {connectingSourceId && (
            (() => {
               const source = nodes.find(n => n.id === connectingSourceId);
               if(!source) return null;
               const sx = source.position.x + NODE_WIDTH;
               const sy = source.position.y + NODE_HEIGHT / 2;
               return (
                 <path
                   d={getEdgePath(sx, sy, mousePos.x, mousePos.y)}
                   stroke="#3b82f6"
                   strokeWidth="2"
                   strokeDasharray="5,5"
                   fill="none"
                   markerEnd="url(#arrowhead-active)"
                   className="animate-pulse"
                 />
               )
            })()
          )}
        </svg>

        {/* 渲染节点 */}
        {nodes.map(node => {
          const isSelected = selectedElement?.id === node.id;
          const isConnecting = connectingSourceId !== null;
          
          return (
            <div
              key={node.id}
              // === 关键修复点：增加 onClick 并停止冒泡 ===
              onClick={(e) => e.stopPropagation()} 
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseUp={(e) => isConnecting && endConnection(e, node.id)}
              style={{ 
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                width: NODE_WIDTH,
                height: NODE_HEIGHT
              }}
              className={`absolute z-10 bg-white rounded-xl shadow-sm border-2 transition-all group hover:shadow-md select-none
                ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'}
                ${isConnecting && connectingSourceId !== node.id ? 'hover:border-blue-400 hover:scale-105 cursor-crosshair' : ''}
              `}
            >
              <div className={`h-2 rounded-t-lg w-full mb-3 ${
                node.type === 'logic' ? 'bg-amber-400' : 
                node.type === 'system' ? 'bg-slate-400' : 
                node.type === 'alert' ? 'bg-rose-400' : 'bg-blue-500'
              }`} />
              
              <div className="px-4">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{node.type}</span>
                   {isSelected && <Move size={12} className="text-blue-500" />}
                </div>
                <div className="font-bold text-slate-800 text-sm mb-1 truncate">{node.data.title}</div>
                <div className="text-xs text-slate-500 line-clamp-2 h-8 leading-4">{node.data.desc}</div>
                
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                   {node.data.script ? <MessageSquare size={12} className="text-blue-400"/> : <div className="w-3"/>}
                   {node.data.links?.length > 0 && (
                     <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded flex items-center">
                        <LinkIcon size={8} className="mr-1"/> {node.data.links.length}
                     </span>
                   )}
                </div>
              </div>

              {/* Handles */}
              <div className={`absolute top-1/2 -left-3 w-6 h-6 flex items-center justify-center transition-all ${isConnecting && connectingSourceId !== node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                 <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${isConnecting && connectingSourceId !== node.id ? 'bg-blue-500 scale-125' : 'bg-slate-300'}`}></div>
              </div>
              <div 
                onMouseDown={(e) => startConnection(e, node.id)}
                data-handle="output"
                className="absolute top-1/2 -right-3 w-6 h-6 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              >
                 <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm pointer-events-none"></div>
              </div>

            </div>
          );
        })}
      </div>

      {/* 3. 右侧属性面板 (保持不变) */}
      <div className="w-80 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center">
            <Settings2 size={16} className="mr-2"/> 属性配置
          </h3>
          <button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded flex items-center transition-colors">
            <Save size={14} className="mr-1.5"/> 保存
          </button>
        </div>

        {selectedNode ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">节点 ID</label>
              <div className="flex gap-2">
                 <input disabled value={selectedNode.id} className="flex-1 bg-slate-100 border border-slate-200 rounded px-3 py-2 text-xs text-slate-500 font-mono" />
                 <button onClick={deleteSelected} className="text-rose-500 hover:bg-rose-50 px-2 rounded border border-rose-200"><Trash2 size={14}/></button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">标题</label>
              <input 
                value={selectedNode.data.title} 
                onChange={(e) => updateNodeData('title', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">描述</label>
              <textarea 
                value={selectedNode.data.desc} 
                onChange={(e) => updateNodeData('desc', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none" 
              />
            </div>

            {selectedNode.type !== 'logic' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase flex justify-between">
                  <span>推荐话术</span>
                  <MessageSquare size={12}/>
                </label>
                <textarea 
                  value={selectedNode.data.script} 
                  onChange={(e) => updateNodeData('script', e.target.value)}
                  className="w-full bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm h-32 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none text-slate-700" 
                  placeholder="输入话术..."
                />
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
               <label className="block text-xs font-bold text-slate-500 mb-3 uppercase flex justify-between items-center">
                <span>关联知识链接</span>
                <button onClick={() => updateNodeData('links', [...(selectedNode.data.links||[]), {title:'', url:''}])} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                  <Plus size={14} />
                </button>
              </label>
              <div className="space-y-3">
                {selectedNode.data.links?.map((link, idx) => (
                  <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs relative group">
                    <button onClick={() => {
                        const newLinks = selectedNode.data.links.filter((_, i) => i !== idx);
                        updateNodeData('links', newLinks);
                    }} className="absolute top-1 right-1 text-slate-300 hover:text-rose-500"><X size={12}/></button>
                    <input 
                      placeholder="标题"
                      value={link.title}
                      onChange={(e) => updateLink(idx, 'title', e.target.value)}
                      className="w-full border-b border-slate-200 bg-transparent mb-1 focus:outline-none focus:border-blue-400 pb-1"
                    />
                    <input 
                       placeholder="URL"
                       value={link.url}
                       onChange={(e) => updateLink(idx, 'url', e.target.value)}
                       className="w-full text-slate-400 bg-transparent focus:outline-none focus:text-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
            <MousePointer2 size={48} className="mb-4 opacity-20"/>
            <p className="text-sm font-medium text-slate-500">画布操作指南</p>
            <ul className="text-xs text-left list-disc pl-6 mt-4 space-y-2 opacity-70">
              <li>点击左上角图标添加新节点</li>
              <li>拖拽节点调整位置</li>
              <li>从节点<b className="text-blue-500">右侧蓝点</b>拖出连线</li>
              <li>Hover 连线点击红色 X 删除连线</li>
              <li>选中节点按 <kbd className="font-mono bg-slate-200 px-1 rounded">Del</kbd> 删除</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. AgentWorkspace (适配动态 Nodes)
// ==========================================
function AgentWorkspace({ nodes, edges }) {
  const [activeProcessId, setActiveProcessId] = useState("default");
  const [detectedIntent, setDetectedIntent] = useState(null);
  
  // 核心：基于 Graph 计算出的当前步骤
  // 在真实场景中，这里应该根据边的关系来遍历。为了Demo简单，我们依然使用ID映射，但内容来自nodes
  const FLOW_IDS = {
    RETENTION: "retention",
    WAIT_SCRIPT: "wait_script",
    AUTO_CHECK: "auto_check",
    CHECK_DURATION: "check_duration",
    CHECK_COUPON: "check_coupon",
    CONFIRMATION: "confirmation",
    COMPLAINT: "complaint",
    DONE: "done",
  };
  
  // 仍然保持一个逻辑序列用于左侧导航展示 (在真实引擎中这通常是根据 Graph 拓扑排序生成的)
  const FLOW_SEQUENCE = [
    FLOW_IDS.RETENTION,
    FLOW_IDS.WAIT_SCRIPT,
    FLOW_IDS.AUTO_CHECK,
    FLOW_IDS.CHECK_DURATION,
    FLOW_IDS.CHECK_COUPON,
    FLOW_IDS.CONFIRMATION,
  ];

  const [flowStep, setFlowStep] = useState(FLOW_IDS.RETENTION);
  const [history, setHistory] = useState([]);
  const [isEnded, setIsEnded] = useState(false);
  
  // 模拟中台数据
  const [simulation, setSimulation] = useState({ isFrozen: false, daysOpen: 3, hasUsedCoupon: false });
  const [blackboard, setBlackboard] = useState({ retentionResult: null, isFrozen: null, daysOpen: null, hasUsedCoupon: null });
  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const addMsg = (text, sender) => setMessages((p) => [...p, { id: Date.now(), text, sender }]);

  const handleCustomerEntry = () => {
    addMsg("您好，我刚买的会员想退款，可以处理吗？", "customer");
    setTimeout(() => {
      setDetectedIntent({ id: "refund_member", name: "会员退款诉求", confidence: 0.98 });
    }, 1000);
  };

  const transitionTo = (nextStepId) => {
    setHistory((prev) => [...prev, flowStep]);
    setFlowStep(nextStepId);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    if (isEnded) { setIsEnded(false); return; }
    const newHistory = [...history];
    const prevStep = newHistory.pop();
    setHistory(newHistory);
    setFlowStep(prevStep);
  };

  const activateFlow = (processId) => {
    setActiveProcessId(processId);
    setDetectedIntent(null);
    setFlowStep(FLOW_IDS.RETENTION);
    setHistory([]);
    setIsEnded(false);
    setBlackboard({ retentionResult: null, isFrozen: null, daysOpen: null, hasUsedCoupon: null });
    addMsg("(系统已自动加载 SOP-001 会员退款流程)", "system");
  };

  const handleManualEnd = () => {
    setIsEnded(true);
    addMsg("感谢您的来电，祝您生活愉快，再见。", "agent");
  };

  const handleComplaintTrigger = () => {
    addMsg("太慢了！我要投诉你们！", "customer");
    transitionTo(FLOW_IDS.COMPLAINT);
    setIsEnded(false);
  };

  // 辅助函数：根据ID获取节点数据
  const getNode = (id) => nodes.find(n => n.id === id)?.data || {};

  // 业务逻辑 (保持逻辑判断，但文案取自 getNode)
  const handleRetention = (result) => {
    setBlackboard((p) => ({ ...p, retentionResult: result }));
    if (result === "accept") {
      addMsg("好的，那我再用用看。", "customer");
      addMsg("(系统提示：客户接受挽留，请确认无误后点击下方【结束服务】)", "system");
    } else {
      addMsg("不用了，还是退吧。", "customer");
      transitionTo(FLOW_IDS.WAIT_SCRIPT);
    }
  };

  const handleSendWait = () => {
    addMsg(getNode(FLOW_IDS.WAIT_SCRIPT).script, "agent");
    transitionTo(FLOW_IDS.AUTO_CHECK);
    setTimeout(() => {
      const frozen = simulation.isFrozen;
      setBlackboard((p) => ({ ...p, isFrozen: frozen }));
      if (frozen) { transitionTo(FLOW_IDS.CONFIRMATION); } 
      else { transitionTo(FLOW_IDS.CHECK_DURATION); }
    }, 1500);
  };

  const handleConfirmDuration = () => {
    setBlackboard((p) => ({ ...p, daysOpen: simulation.daysOpen }));
    // 这里的规则 logic 依然保留在代码里，作为“规则引擎”的一部分
    if (simulation.daysOpen > 7) transitionTo(FLOW_IDS.CONFIRMATION);
    else transitionTo(FLOW_IDS.CHECK_COUPON);
  };

  const handleConfirmCoupon = (status) => {
    setBlackboard((p) => ({ ...p, hasUsedCoupon: status }));
    transitionTo(FLOW_IDS.CONFIRMATION);
  };

  const getConfirmScript = () => {
    // 简单模拟最终生成逻辑
    if (blackboard.isFrozen) return "经核实，您的账户符合全额退款条件。我现在为您发起原路退回。";
    if (blackboard.daysOpen > 7) return `非常抱歉，核实到您的会员开通已超过 7 天，根据平台规则无法办理退款。感谢您的理解。`;
    if (blackboard.hasUsedCoupon) return "经核实，由于您已使用优惠券，根据规则需扣除优惠金额后退还剩余款项，请您确认是否办理。";
    return "经核实，您的账户符合全额退款条件。我现在为您发起原路退回。";
  };

  const renderDashboardSlot = (label, val, status) => {
    let colorClass = "bg-slate-100 text-slate-400";
    if (status === "good") colorClass = "bg-emerald-100 text-emerald-700";
    if (status === "bad") colorClass = "bg-rose-100 text-rose-700";
    if (status === "warn") colorClass = "bg-amber-100 text-amber-700";
    return (
      <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${colorClass} transition-all duration-500`}>
        <span className="text-[10px] uppercase font-bold opacity-70 mb-1">{label}</span>
        <span className="text-sm font-bold">{val === null ? "--" : String(val)}</span>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full font-sans text-slate-800 bg-slate-50 overflow-hidden">
      <UserProfilePanel />
      {/* Middle Chat Area (Unchanged) */}
      <div className="flex-1 flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden shadow-sm z-0 relative">
        <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center">
            <div className={`w-2.5 h-2.5 rounded-full mr-3 ${isEnded ? "bg-slate-300" : "bg-emerald-500 animate-pulse"}`}></div>
            <div>
              <div className="font-bold text-slate-800">在线会话 #29381</div>
              <div className="text-xs text-slate-400">持续时长 04:12</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "agent" ? "justify-end" : msg.sender === "system" ? "justify-center" : "justify-start"} animate-fade-in-up`}>
              {msg.sender === "system" ? (
                <span className="text-[10px] text-slate-400 bg-slate-200/50 px-3 py-1 rounded-full">{msg.text}</span>
              ) : (
                <div className={`max-w-[70%] px-5 py-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${msg.sender === "agent" ? "bg-blue-600 text-white rounded-br-none shadow-blue-200" : "bg-white text-slate-700 border border-slate-100 rounded-bl-none shadow-slate-100"}`}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* God Mode Controls (Unchanged) */}
        <div className="h-44 bg-slate-900 text-white p-6 flex flex-col shadow-2xl shrink-0 z-20">
             <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center">
              <Sliders size={14} className="mr-2" /> 演示控制台 (God Mode)
            </h3>
            <button
              onClick={() => {
                setMessages([]);
                setActiveProcessId("default");
                setDetectedIntent(null);
                setIsEnded(false);
              }}
              className="text-[10px] text-slate-500 hover:text-white flex items-center transition-colors"
            >
              <RotateCcw size={12} className="mr-1.5" />
              重置会话
            </button>
          </div>
          <div className="flex gap-8 h-full">
            <div className="w-48 flex flex-col gap-3 border-r border-slate-700 pr-8">
              <button
                onClick={handleCustomerEntry}
                disabled={messages.length > 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium py-2.5 rounded-lg flex items-center justify-center transition-all"
              >
                <PlayCircle size={16} className="mr-2" /> 客户进线
              </button>
              <button
                onClick={handleComplaintTrigger}
                className="w-full bg-transparent border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center transition-all"
              >
                <Zap size={16} className="mr-2" /> 触发投诉
              </button>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div className="col-span-1 flex flex-col justify-center items-center bg-slate-800 rounded-lg p-2">
                <span className="text-[10px] text-slate-400 mb-2">账户冻结</span>
                <button
                  onClick={() => setSimulation((p) => ({ ...p, isFrozen: !p.isFrozen }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${simulation.isFrozen ? "bg-rose-500" : "bg-slate-600"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${simulation.isFrozen ? "translate-x-6" : ""}`} />
                </button>
              </div>
              <div className="col-span-1 flex flex-col justify-center items-center bg-slate-800 rounded-lg p-2">
                <span className="text-[10px] text-slate-400 mb-2">使用优惠券</span>
                <button
                  onClick={() => setSimulation((p) => ({ ...p, hasUsedCoupon: !p.hasUsedCoupon }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${simulation.hasUsedCoupon ? "bg-amber-500" : "bg-slate-600"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${simulation.hasUsedCoupon ? "translate-x-6" : ""}`} />
                </button>
              </div>
              <div className="col-span-2 flex flex-col justify-center bg-slate-800 rounded-lg px-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">开通时长</span>
                  <span className={simulation.daysOpen > 7 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                    {simulation.daysOpen} 天
                  </span>
                </div>
                <input
                  type="range"
                  min="1" max="15"
                  value={simulation.daysOpen}
                  onChange={(e) => setSimulation((p) => ({ ...p, daysOpen: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Intelligent SOP Panel */}
      <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col h-full shadow-[0_0_20px_rgba(0,0,0,0.05)] z-10 shrink-0">
        <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 shrink-0 sticky top-0 z-20">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <LayoutDashboard size={14} className="mr-1.5" /> 智能流程导航
            </div>
            {(history.length > 0 || isEnded) && (
              <button onClick={handleBack} className="flex items-center text-xs text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-all font-medium">
                <ArrowLeft size={14} className="mr-1.5" /> 返回
              </button>
            )}
          </div>
          <div className="relative group">
            <select
              value={activeProcessId}
              onChange={(e) => activateFlow(e.target.value)}
              className="w-full text-sm border-slate-200 rounded-lg py-3 pl-4 pr-10 border shadow-sm outline-none appearance-none bg-slate-50 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-400 cursor-pointer hover:bg-white"
            >
              <option value="default">请选择业务场景...</option>
              <option value="refund_member">会员退款流程 (SOP-001)</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
          </div>
        </div>

        {detectedIntent && activeProcessId !== detectedIntent.id && (
          <div className="mx-6 mt-6 animate-slide-in-right shrink-0">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 shadow-lg shadow-blue-200 text-white relative overflow-hidden">
              <Sparkles className="absolute -top-4 -right-4 text-white opacity-20" size={60} />
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center font-bold text-xs bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                  <Zap size={12} className="mr-1 text-yellow-300" /> AI 意图识别
                </div>
                <span className="text-[10px] opacity-80">{Math.floor(detectedIntent.confidence * 100)}% 匹配</span>
              </div>
              <div className="text-lg font-bold mb-4 relative z-10">{detectedIntent.name}</div>
              <button onClick={() => activateFlow(detectedIntent.id)} className="w-full bg-white text-blue-700 text-sm font-bold py-2.5 rounded-lg flex items-center justify-center shadow-md hover:bg-blue-50 transition-colors">
                立即启动流程 <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {activeProcessId === "refund_member" && !isEnded && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {renderDashboardSlot("冻结状态", blackboard.isFrozen === null ? null : blackboard.isFrozen ? "冻结" : "正常", blackboard.isFrozen ? "bad" : "good")}
                {renderDashboardSlot("开通时长", blackboard.daysOpen ? `${blackboard.daysOpen}天` : null, blackboard.daysOpen > 7 ? "bad" : "good")}
                {renderDashboardSlot("优惠券", blackboard.hasUsedCoupon === null ? null : blackboard.hasUsedCoupon ? "已用" : "未用", blackboard.hasUsedCoupon ? "warn" : "good")}
              </div>

              {flowStep === FLOW_IDS.COMPLAINT ? (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 shadow-lg shadow-rose-100 animate-pulse relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                  <div className="flex items-center text-rose-700 font-bold text-lg mb-2">
                    <AlertTriangle size={24} className="mr-2" /> 异常中断：投诉安抚
                  </div>
                  <p className="text-sm text-rose-600/80 mb-4">{getNode(FLOW_IDS.COMPLAINT).desc}</p>
                  <div className="bg-white p-4 rounded-lg mb-4 text-sm text-slate-700 shadow-sm border border-rose-100 italic leading-relaxed">
                    "{getNode(FLOW_IDS.COMPLAINT).script}"
                  </div>
                  <button onClick={() => addMsg(getNode(FLOW_IDS.COMPLAINT).script, "agent")} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex justify-center items-center">
                    <MessageSquare size={16} className="mr-2" /> 发送安抚话术
                  </button>
                   {/* 异常流程下的知识库 */}
                   {getNode(FLOW_IDS.COMPLAINT).links?.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-rose-100/50">
                       <h5 className="text-[10px] font-bold text-rose-400 uppercase mb-2">参考知识</h5>
                       {getNode(FLOW_IDS.COMPLAINT).links.map((link,i) => (
                         <a key={i} href={link.url} className="flex items-center text-xs text-rose-700 hover:underline mb-1"><LinkIcon size={10} className="mr-1"/> {link.title}</a>
                       ))}
                     </div>
                   )}
                </div>
              ) : (
                <div className="relative pl-3">
                  <div className="absolute left-[19px] top-4 bottom-0 w-[2px] bg-slate-100"></div>
                  {FLOW_SEQUENCE.map((stepId, index) => {
                    const currentIndex = FLOW_SEQUENCE.indexOf(flowStep);
                    const isCompleted = index < currentIndex;
                    const isActive = stepId === flowStep;
                    const isPending = index > currentIndex;
                    const nodeData = getNode(stepId);
                    if (!nodeData.title) return null; // Skip if node doesn't exist in config

                    return (
                      <div key={stepId} className={`relative flex items-start mb-8 group ${isPending ? "opacity-40" : "opacity-100"}`}>
                        <div className={`w-8 h-8 rounded-full border-[3px] flex items-center justify-center shrink-0 mr-5 z-10 bg-white transition-all duration-500 ${isActive ? "border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.1)] scale-110" : isCompleted ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                          {isActive && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />}
                          {isCompleted && <Check size={16} className="text-emerald-600" />}
                          {isPending && <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                        </div>
                        <div className="flex-1 pt-1">
                          <h4 className={`text-sm font-bold transition-colors ${isActive ? "text-slate-800 text-base" : isCompleted ? "text-emerald-700" : "text-slate-400"}`}>{nodeData.title}</h4>
                          {isActive && (
                            <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-100/50 p-5 animate-fade-in-up relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                              <p className="text-xs text-slate-500 mb-4">{nodeData.desc}</p>
                              
                              {/* 动态话术区域 */}
                              {nodeData.script && (
                                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg mb-4 rounded-tl-none relative group-hover:border-blue-100 transition-colors">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex justify-between">
                                    推荐话术 <MessageSquare size={10} />
                                  </div>
                                  <div className="text-sm text-slate-700 leading-relaxed font-medium">"{nodeData.script}"</div>
                                </div>
                              )}

                              {/* === 新增：关联知识胶囊 === */}
                              {nodeData.links && nodeData.links.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex flex-wrap gap-2">
                                    {nodeData.links.map((link, idx) => (
                                      <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-100 text-[10px] font-bold hover:bg-blue-100 transition-colors">
                                        <LinkIcon size={10} className="mr-1.5"/>
                                        {link.title}
                                        <ExternalLink size={8} className="ml-1 opacity-50"/>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 操作区 (Logic remains hardcoded but uses dynamic content above) */}
                              <div className="space-y-3">
                                {stepId === FLOW_IDS.RETENTION && (
                                  <>
                                    <button onClick={() => addMsg(nodeData.script, "agent")} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-blue-700 transition-all flex items-center justify-center">
                                      <MessageSquare size={16} className="mr-2" /> 一键发送
                                    </button>
                                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                                      <button onClick={() => handleRetention("accept")} className="flex-1 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100">客户接受</button>
                                      <button onClick={() => handleRetention("reject")} className="flex-1 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200">客户拒绝</button>
                                    </div>
                                  </>
                                )}
                                {stepId === FLOW_IDS.WAIT_SCRIPT && (
                                  <button onClick={handleSendWait} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow hover:bg-blue-700 transition-all">
                                    发送并开始查询
                                  </button>
                                )}
                                {stepId === FLOW_IDS.AUTO_CHECK && (
                                  <div className="py-6 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <Timer className="animate-spin text-blue-500 mb-2" size={24} />
                                    <span className="text-xs text-slate-500 font-medium">正在连接业务中台...</span>
                                  </div>
                                )}
                                {stepId === FLOW_IDS.CHECK_DURATION && (
                                  <>
                                    <div className="bg-amber-50 p-3 rounded-lg text-center text-sm border border-amber-100 mb-2">
                                      <span className="text-amber-800/60 mr-2">CRM 数据返回:</span>
                                      <span className={`font-bold ${simulation.daysOpen > 7 ? "text-rose-500" : "text-emerald-600"}`}>{simulation.daysOpen} 天</span>
                                    </div>
                                    <button onClick={handleConfirmDuration} className="w-full bg-amber-500 text-white font-bold py-2.5 rounded-lg shadow hover:bg-amber-600 transition-all">确认填入</button>
                                  </>
                                )}
                                {stepId === FLOW_IDS.CHECK_COUPON && (
                                  <div className="flex gap-3">
                                    <button onClick={() => handleConfirmCoupon(true)} className="flex-1 bg-white border-2 border-slate-200 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all">是, 已使用</button>
                                    <button onClick={() => handleConfirmCoupon(false)} className="flex-1 bg-white border-2 border-slate-200 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all">否, 未使用</button>
                                  </div>
                                )}
                                {stepId === FLOW_IDS.CONFIRMATION && (
                                  <button onClick={() => { addMsg(getConfirmScript(), "agent"); setFlowStep(FLOW_IDS.DONE); }} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center">
                                    <CheckCircle2 size={18} className="mr-2" /> 发送方案并执行
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {isEnded && (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-20 animate-fade-in-up">
              <CheckCircle2 size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-bold text-slate-400">服务流程已完结</p>
              <button onClick={() => setIsEnded(false)} className="mt-6 px-6 py-2 bg-white border border-slate-200 rounded-full text-sm text-blue-600 font-bold shadow-sm hover:shadow-md transition-all">
                撤销结束状态
              </button>
            </div>
          )}
          {activeProcessId === "default" && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-20">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search size={40} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">请等待意图识别或手动选择流程</p>
            </div>
          )}
        </div>
        {activeProcessId !== "default" && !isEnded && (
          <div className="p-4 border-t border-slate-100 bg-white/80 backdrop-blur shrink-0 z-20">
            <button onClick={handleManualEnd} className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all shadow-sm hover:shadow">
              <Power size={16} className="mr-2" /> 结束本次服务
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. App 入口
// ==========================================
export default function App() {
  const [currentView, setCurrentView] = useState("workspace");
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);

  const handleSaveConfig = () => {
    // 模拟保存到后端
    alert("流程配置已保存！工作台将立即应用新配置。");
    // 在真实应用中，这里会 post 到 API
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 font-sans overflow-hidden text-slate-800">
      <GlobalStyles />
      <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 shadow-md z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(37,99,235,0.5)]">
            <Zap size={16} className="text-white fill-current" />
          </div>
          <h1 className="font-bold text-sm tracking-wide">
            SmartCS <span className="opacity-50 font-normal">| 智能座席辅助</span>
          </h1>
        </div>
        <div className="flex bg-slate-800 rounded p-1">
          <button onClick={() => setCurrentView("workspace")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${currentView === "workspace" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>
            <LayoutDashboard size={14} className="mr-1.5 inline" /> 工作台
          </button>
          <button onClick={() => setCurrentView("admin")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${currentView === "admin" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>
            <PenTool size={14} className="mr-1.5 inline" /> 后台配置
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative w-full">
        {currentView === "workspace" ? (
          <AgentWorkspace nodes={nodes} edges={edges} />
        ) : (
          <AdminCanvas nodes={nodes} edges={edges} setNodes={setNodes} onSave={handleSaveConfig} />
        )}
      </div>
    </div>
  );
}