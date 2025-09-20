console.clear();

// 创建场景对象 Scene
const scene = new THREE.Scene();

// 创建透视相机
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

//  创建渲染器对象
const renderer = new THREE.WebGLRenderer({
  antialias: true, //  是否执行抗锯齿。默认值为false。
});

// 设置颜色及其透明度
renderer.setClearColor(new THREE.Color("rgb(0,0,0)"));

// 将输 canvas 的大小调整为 (width, height) 并考虑设备像素比，且将视口从 (0, 0) 开始调整到适合大小
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 表示对象局部位置的 Vector3。默认值为(0, 0, 0)。
camera.position.z = 1.8;

// 轨迹球控制器
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 3;
controls.minDistance = 0.7;

// 物体
const group = new THREE.Group();
scene.add(group);

let heart = null;
let sampler = null;
let originHeart = null;

// OBJ加载器
new THREE.OBJLoader().load(
  "https://assets.codepen.io/127738/heart_2.obj",
  (obj) => {
    heart = obj.children[0];
    heart.geometry.rotateX(-Math.PI * 0.5);
    heart.geometry.scale(0.04, 0.04, 0.04);
    heart.geometry.translate(0, -0.4, 0);
    group.add(heart);

    // 基础网格材质
    heart.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("rgb(0,0,0)"),
    });
    originHeart = Array.from(heart.geometry.attributes.position.array);
    // 用于在网格表面上采样加权随机点的实用程序类。
    sampler = new THREE.MeshSurfaceSampler(heart).build();
    // 生成表皮
    init();
    // 每一帧都会调用
    renderer.setAnimationLoop(render);
  }
);

let positions = [];
let colors = [];
const geometry = new THREE.BufferGeometry();

const material = new THREE.PointsMaterial({
  vertexColors: true, // Let Three.js knows that each point has a different color
  size: 0.009,
});

const particles = new THREE.Points(geometry, material);
group.add(particles);

const simplex = new SimplexNoise();
const pos = new THREE.Vector3();
const palette = [
  new THREE.Color("#ffd4ee"),
  new THREE.Color("#ff77fc"),
  new THREE.Color("#ff77ae"),
  new THREE.Color("#ff1775"),
];
class SparkPoint {
  constructor() {
    sampler.sample(pos);
    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.rand = Math.random() * 0.03;
    this.pos = pos.clone();
    this.one = null;
    this.two = null;
  }
  update(a) {
    const noise =
      simplex.noise4D(this.pos.x * 1, this.pos.y * 1, this.pos.z * 1, 0.1) +
      1.5;
    const noise2 =
      simplex.noise4D(this.pos.x * 500, this.pos.y * 500, this.pos.z * 500, 1) +
      1;
    this.one = this.pos.clone().multiplyScalar(1.01 + noise * 0.15 * beat.a);
    this.two = this.pos
      .clone()
      .multiplyScalar(1 + noise2 * 1 * (beat.a + 0.3) - beat.a * 1.2);
  }
}

let spikes = [];
function init(a) {
  positions = [];
  colors = [];
  for (let i = 0; i < 10000; i++) {
    const g = new SparkPoint();
    spikes.push(g);
  }
}

const beat = { a: 0 };
gsap
  .timeline({
    repeat: -1,
    repeatDelay: 0.3,
  })
  .to(beat, {
    a: 0.5,
    duration: 0.6,
    ease: "power2.in",
  })
  .to(beat, {
    a: 0.0,
    duration: 0.6,
    ease: "power3.out",
  });

// 0.22954521554974774 -0.22854083083283794
const maxZ = 0.23;
const rateZ = 0.5;

function render(a) {
  positions = [];
  colors = [];
  spikes.forEach((g, i) => {
    g.update(a);
    const rand = g.rand;
    const color = g.color;
    if (maxZ * rateZ + rand > g.one.z && g.one.z > -maxZ * rateZ - rand) {
      positions.push(g.one.x, g.one.y, g.one.z);
      colors.push(color.r, color.g, color.b);
    }
    if (
      maxZ * rateZ + rand * 2 > g.one.z &&
      g.one.z > -maxZ * rateZ - rand * 2
    ) {
      positions.push(g.two.x, g.two.y, g.two.z);
      colors.push(color.r, color.g, color.b);
    }
  });
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3)
  );

  const vs = heart.geometry.attributes.position.array;
  for (let i = 0; i < vs.length; i += 3) {
    const v = new THREE.Vector3(
      originHeart[i],
      originHeart[i + 1],
      originHeart[i + 2]
    );
    const noise =
      simplex.noise4D(
        originHeart[i] * 1.5,
        originHeart[i + 1] * 1.5,
        originHeart[i + 2] * 1.5,
        a * 0.0005
      ) + 1;
    v.multiplyScalar(0 + noise * 0.15 * beat.a);
    vs[i] = v.x;
    vs[i + 1] = v.y;
    vs[i + 2] = v.z;
  }
  heart.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


// Chặn các phím tắt và hành động chuột
document.addEventListener('keydown', (event) => {
  // Chặn phím F12 và các tổ hợp phím khác liên quan đến DevTools
  if (
    event.key === 'F12' ||
    (event.ctrlKey && event.shiftKey && ['I', 'C', 'J', 'K'].includes(event.key.toUpperCase())) ||
    (event.metaKey && event.altKey && ['I', 'J', 'C'].includes(event.key.toUpperCase()))
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

// Chặn chuột phải và các hành vi sao chép
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('selectstart', (event) => event.preventDefault());
document.addEventListener('copy', (event) => event.preventDefault());
document.addEventListener('cut', (event) => event.preventDefault());
document.addEventListener('paste', (event) => event.preventDefault());



document.addEventListener('keydown', (event) => {
  // 1. Tổ hợp phím chung
  if (
    event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
  ) {
    // Chặn các tổ hợp phím sao chép, cắt, dán, lưu
    if (
      ['c', 'v', 'x', 'z', 'y', 'a', 's'].includes(event.key.toLowerCase()) ||
      (event.ctrlKey && event.key.toLowerCase() === 'y' && event.shiftKey) // Ctrl + Shift + Y
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Chặn Alt + Tab / Cmd + Tab
  if ((event.altKey && event.key === 'Tab') || (event.metaKey && event.key === 'Tab')) {
    event.preventDefault();
    event.stopPropagation();
  }
  // Chặn Alt + F4 / Cmd + Q
  if ((event.altKey && event.key === 'F4') || (event.metaKey && event.key === 'q')) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // 2. Tổ hợp phím trong VS Code (một số phím trùng với chung)
  if (
    event.ctrlKey || event.metaKey
  ) {
    if (
      ['p', '/', 'd', 'f', 'h', 'b', '`'].includes(event.key.toLowerCase()) ||
      (event.key === 'F' && event.shiftKey) || // Ctrl+Shift+F
      (event.key === 'L' && event.shiftKey) // Ctrl+Shift+L
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Chặn di chuyển dòng Alt + ↑/↓
  if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault();
    event.stopPropagation();
  }

  // 3. Tổ hợp phím trong Trình duyệt DevTools
  if (
    event.key === 'F12' ||
    (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(event.key.toUpperCase())) ||
    (event.metaKey && event.altKey && ['I', 'J', 'C'].includes(event.key.toUpperCase()))
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Chặn Ctrl+R, Ctrl+Shift+R
  if (event.ctrlKey && event.key.toLowerCase() === 'r') {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Chặn Ctrl+Shift+P
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
    event.preventDefault();
    event.stopPropagation();
  }

  // 4. Terminal / Command Line
  if (event.ctrlKey) {
    if (['c', 'l', 'a', 'e', 'u', 'k'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // 6. Tổ hợp phím trong thiết kế
  if (event.ctrlKey && event.key.toLowerCase() === 'g') {
    event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey) { // Ctrl+Shift+G
      event.preventDefault();
      event.stopPropagation();
    }
  }
  if (event.key.toLowerCase() === 't' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (event.key === ' ' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
    event.preventDefault();
    event.stopPropagation();
  }
});

document.addEventListener('keydown', (event) => {
  // Kiểm tra nếu phím Ctrl hoặc Cmd (trên Mac) đang được nhấn
  if (event.ctrlKey || event.metaKey) {
    // Ngăn chặn hành vi mặc định của trình duyệt
    event.preventDefault();
    
    // Ngăn chặn sự kiện lan truyền lên các phần tử cha
    event.stopPropagation();
  }
});
