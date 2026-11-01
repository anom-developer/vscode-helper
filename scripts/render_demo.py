from PIL import Image, ImageDraw, ImageFont
import os

width, height = 880, 440

def create_base():
    img = Image.new('RGB', (width, height), color='#1e1e2e')
    draw = ImageDraw.Draw(img)
    # Window border
    draw.rounded_rectangle([15, 15, width-15, height-15], radius=14, fill='#181825', outline='#313244', width=2)
    # Title bar
    draw.rounded_rectangle([15, 15, width-15, 54], radius=14, fill='#11111b')
    draw.rectangle([15, 40, width-15, 54], fill='#11111b')
    # Dots
    draw.ellipse([35, 28, 47, 40], fill='#ff5f56')
    draw.ellipse([55, 28, 67, 40], fill='#ffbd2e')
    draw.ellipse([75, 28, 87, 40], fill='#27c93f')
    # Title
    draw.text((width//2 - 160, 26), 'Visual Studio Code — app.ts (vscode-helper v0.2.0)', fill='#a6adc8')
    # Tab
    draw.rectangle([15, 54, 155, 86], fill='#181825', outline='#313244')
    draw.line([15, 54, 155, 54], fill='#007acc', width=3)
    draw.text((30, 62), 'TS  app.ts', fill='#cdd6f4')
    # Gutter
    draw.rectangle([15, 86, 65, height-34], fill='#181825', outline='#313244')
    for i, line_num in enumerate(['1', '2', '3', '4', '5', '6', '7', '8']):
        draw.text((45, 105 + i*26), line_num, fill='#45475a')
    # Status bar
    draw.rounded_rectangle([15, height-34, width-15, height-15], radius=10, fill='#11111b')
    draw.rectangle([15, height-34, width-15, height-25], fill='#11111b')
    draw.rectangle([15, height-34, 45, height-15], fill='#007acc')
    return img, draw

# Frame 1: Issues detected
f1, d1 = create_base()
d1.text((80, 105), '// ⚡ VSCode Helper: Real-time diagnostics & one-click auto-fix', fill='#6c7086')
d1.text((80, 131), 'var user = "Alice";  // 💡 Rule [no-var]', fill='#f38ba8')
d1.line([80, 147, 108, 147], fill='#f59e0b', width=2)
d1.text((80, 157), 'if (status == null) {  // 💡 Rule [eqeqeq]', fill='#cdd6f4')
d1.line([145, 173, 160, 173], fill='#f59e0b', width=2)
d1.text((80, 183), '  console.log(`User ${user} ready`);', fill='#cdd6f4')
d1.text((80, 209), '  debugger;  // 💡 Rule [no-debugger]', fill='#f38ba8')
d1.line([98, 225, 165, 225], fill='#ef4444', width=2)
d1.text((80, 235), '}', fill='#cdd6f4')
d1.text((80, 270), '# Python support: detects except:, None comparison, mutable defaults', fill='#6c7086')
d1.text((80, 296), '// Java, C/C++, Go, Rust: detects raw ==, NULL, panic(), unwrap()', fill='#6c7086')
d1.ellipse([350, height-26, 360, height-16], fill='#f59e0b')
d1.text((370, height-26), 'VSCode Helper: 3 issues', fill='#cdd6f4')
d1.text((width-120, height-26), 'TypeScript', fill='#6c7086')

# Frame 2: Quick Fix Popup
f2 = f1.copy()
d2 = ImageDraw.Draw(f2)
d2.rounded_rectangle([95, 150, 480, 280], radius=8, fill='#1e1f2e', outline='#45475a', width=2)
d2.rounded_rectangle([95, 150, 480, 180], radius=8, fill='#2a2b3d')
d2.text((110, 158), '💡 Quick Fix (Ctrl + .)  [Rule: no-var]', fill='#f9e2af')
d2.rounded_rectangle([102, 186, 472, 214], radius=4, fill='#313244')
d2.text((120, 192), "🛠️ Replace 'var' with 'const'   (Enter ↵)", fill='#ffffff')
d2.text((120, 222), "🛠️ Replace 'var' with 'let'", fill='#a6adc8')
d2.text((120, 248), '✨ Fix all auto-fixable issues in file', fill='#89dceb')

# Frame 3: Auto-fixed clean code
f3, d3 = create_base()
d3.text((80, 105), '// ⚡ VSCode Helper: Real-time diagnostics & one-click auto-fix', fill='#6c7086')
d3.text((80, 131), 'const user = "Alice";  // ✨ Clean Code!', fill='#a6e3a1')
d3.text((80, 157), 'if (status === null) {', fill='#cdd6f4')
d3.text((80, 183), '  console.log(`User ${user} ready`);', fill='#cdd6f4')
d3.text((80, 209), '}', fill='#cdd6f4')
d3.text((80, 270), '# Python support: detects except:, None comparison, mutable defaults', fill='#6c7086')
d3.text((80, 296), '// Java, C/C++, Go, Rust: detects raw ==, NULL, panic(), unwrap()', fill='#6c7086')
d3.ellipse([350, height-26, 360, height-16], fill='#10b981')
d3.text((370, height-26), 'VSCode Helper: All OK (0 issues)', fill='#10b981')
d3.text((width-120, height-26), 'TypeScript', fill='#6c7086')

out_dir = r'd:\ANOM\projects\vscode-helper\media'
os.makedirs(out_dir, exist_ok=True)
f1.save(os.path.join(out_dir, 'demo.png'))
f1.save(
    os.path.join(out_dir, 'demo.gif'),
    save_all=True,
    append_images=[f1, f2, f2, f3, f3],
    duration=1500,
    loop=0
)
print('SUCCESS: Created demo.png and demo.gif')
