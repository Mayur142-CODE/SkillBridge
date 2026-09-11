import { useEffect, useRef, useCallback } from 'react';

const NODES = [
  { id: 'student', label: 'STUDENT', x: 0.25, y: 0.22, color: '#D85C3F', radius: 28 },
  { id: 'skills', label: 'SKILLS', x: 0.5, y: 0.5, color: '#F2B84B', radius: 32 },
  { id: 'faculty', label: 'FACULTY', x: 0.78, y: 0.25, color: '#B8D8C0', radius: 26 },
  { id: 'university', label: 'UNIVERSITY', x: 0.2, y: 0.72, color: '#C4705A', radius: 27 },
  { id: 'industry', label: 'INDUSTRY', x: 0.75, y: 0.7, color: '#F2B84B', radius: 29 },
  { id: 'opportunities', label: 'OPPORTUNITIES', x: 0.52, y: 0.85, color: '#D85C3F', radius: 25 },
];

const EDGES = [
  ['student', 'skills'],
  ['skills', 'faculty'],
  ['skills', 'industry'],
  ['skills', 'opportunities'],
  ['student', 'university'],
  ['university', 'industry'],
  ['faculty', 'university'],
  ['faculty', 'industry'],
  ['industry', 'opportunities'],
  ['student', 'opportunities'],
];

export default function EcosystemVisualization() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: -1, y: -1 });
  const nodesRef = useRef(
    NODES.map((n) => ({
      ...n,
      ox: n.x,
      oy: n.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
      amplitude: 0.008 + Math.random() * 0.012,
    }))
  );
  const particlesRef = useRef(
    EDGES.map(() => ({
      progress: Math.random(),
      speed: 0.001 + Math.random() * 0.002,
    }))
  );

  const getNodePos = useCallback((node, w, h) => {
    return { x: node.x * w, y: node.y * h };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1, y: -1 };
    };
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (time) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      const particles = particlesRef.current;
      const t = time * 0.001;
      const mouse = mouseRef.current;

      // Update node positions with gentle floating
      if (!prefersReduced) {
        nodes.forEach((node) => {
          node.x = node.ox + Math.sin(t * node.speed + node.phase) * node.amplitude;
          node.y =
            node.oy +
            Math.cos(t * node.speed * 0.7 + node.phase + 1) * node.amplitude * 0.8;

          // Mouse repulsion
          if (mouse.x > 0) {
            const pos = getNodePos(node, w, h);
            const dx = pos.x - mouse.x;
            const dy = pos.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              const force = (120 - dist) / 120;
              node.x += (dx / dist) * force * 0.008;
              node.y += (dy / dist) * force * 0.008;
            }
          }
        });
      }

      const nodeMap = {};
      nodes.forEach((n) => {
        nodeMap[n.id] = getNodePos(n, w, h);
      });

      // Draw grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let gx = 0; gx < w; gx += 30) {
        for (let gy = 0; gy < h; gy += 30) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw edges
      EDGES.forEach((edge, i) => {
        const from = nodeMap[edge[0]];
        const to = nodeMap[edge[1]];
        if (!from || !to) return;

        const fromNode = nodes.find((n) => n.id === edge[0]);

        // Curved line
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2 - 20;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(mx, my, to.x, to.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Traveling particle
        if (!prefersReduced) {
          const p = particles[i];
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;
          const pt = p.progress;
          const px = (1 - pt) * (1 - pt) * from.x + 2 * (1 - pt) * pt * mx + pt * pt * to.x;
          const py = (1 - pt) * (1 - pt) * from.y + 2 * (1 - pt) * pt * my + pt * pt * to.y;

          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = fromNode ? fromNode.color + '90' : 'rgba(255,255,255,0.3)';
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        const pos = getNodePos(node, w, h);

        // Glow
        const gradient = ctx.createRadialGradient(
          pos.x, pos.y, 0,
          pos.x, pos.y, node.radius * 2.5
        );
        gradient.addColorStop(0, node.color + '20');
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, node.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, node.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color + '25';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color + '18';
        ctx.fill();
        ctx.strokeStyle = node.color + '70';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Label
        ctx.font = `600 ${node.radius > 28 ? 9 : 8}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '0.1em';
        ctx.fillText(node.label, pos.x, pos.y + node.radius + 16);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [getNodePos]);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '440px', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        aria-label="Interactive ecosystem visualization showing connections between students, skills, faculty, universities, industry, and opportunities"
        role="img"
      />
    </div>
  );
}
