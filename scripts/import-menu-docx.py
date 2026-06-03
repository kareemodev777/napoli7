#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass, asdict
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from lxml import etree
from PIL import Image, ImageOps

DOCX = Path('/Users/kareemo/.hermes/document_cache/doc_1d7cd0ff50ad_Menu-update-1_WEBSITE.docx')
ROOT = Path('/Users/kareemo/Projects/napoli7')
OUT = ROOT / 'tmp/menu_doc_extract'
PUBLIC_PRODUCTS = ROOT / 'public/images/products'
DATA_JSON = ROOT / 'docs/menu-update-1-catalog.json'
MOCK_TS = ROOT / 'src/data/mock/catalog.ts'

CATEGORY_META = {
    'ajman-pizza': {
        'label': 'Ajman Pizza Collection',
        'description': 'Neapolitan pizza reimagined with flavors inspired by Ajman and the cultures of the Emirates.',
        'position': 0,
    },
    'italian-pizza': {
        'label': 'Italian Pizza Collection',
        'description': 'Authentic Neapolitan-style classics with Italian ingredients and traditional craft.',
        'position': 1,
    },
    'focaccia': {
        'label': 'Focaccia Sandwiches',
        'description': 'Focaccia sandwiches made with Napoli 7 dough and premium fillings.',
        'position': 2,
    },
    'dessert': {
        'label': 'Desserts',
        'description': 'Sweet pizzas to finish.',
        'position': 3,
    },
    'drinks': {
        'label': 'Drinks',
        'description': 'Cold drinks to accompany your meal.',
        'position': 4,
    },
}

SECTION_BY_HEADING = {
    'AJMAN PIZZA COLLECTION': 'ajman-pizza',
    'ITALIAN PIZZA COLLECTION': 'italian-pizza',
    'FOCACCIA SANDWICHES': 'focaccia',
    'DESSERTS': 'dessert',
    'DRINKS': 'drinks',
}

@dataclass
class Size:
    id: str
    label: str
    detail: str
    price: float

@dataclass
class Customization:
    ingredient: str
    extraPrice: float | None
    removable: bool
    position: int

@dataclass
class Product:
    id: str
    slug: str
    categoryId: str
    name: str
    nameIt: str | None
    description: str
    price: float
    sizes: list[Size]
    isVeg: bool
    isSpicy: bool
    isActive: bool
    position: int
    imageUrl: str
    customizations: list[Customization]


def slugify(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = text.lower().replace('&', ' and ')
    text = re.sub(r"[^a-z0-9]+", '-', text).strip('-')
    return text or 'item'


def clean_name(raw: str) -> str:
    raw = raw.replace('\u2013', '-').replace('\u2014', '-')
    raw = re.sub(r'^\s*\d+\.\s*', '', raw).strip()
    raw = re.sub(r'\s+', ' ', raw)
    return raw


def parse_price(text: str) -> float | None:
    text = (text or '').replace('O', '0').replace('o', '0')
    m = re.search(r'(\d+(?:\.\d+)?)', text)
    return float(m.group(1)) if m else None


def extract_prices(cells: list[str]) -> tuple[float | None, float | None]:
    joined = ' '.join(cells)
    joined = re.sub(r'(?i)(\d)\s*AED', r'\1 AED', joined)
    medium = small = None
    m = re.search(r'Medium\s*:\s*(\d+(?:\.\d+)?)\s*AED', joined, re.I)
    s = re.search(r'Small\s*:\s*(\d+(?:\.\d+)?)\s*AED', joined, re.I)
    if m: medium = float(m.group(1))
    if s: small = float(s.group(1))
    if medium is None or small is None:
        nums = [float(x) for x in re.findall(r'\b\d+(?:\.\d+)?\b', joined)]
        # first number is often menu index, then medium/small prices
        nums = [n for n in nums if n > 3]
        if len(nums) >= 2:
            medium = medium or nums[0]
            small = small or nums[1]
    return medium, small


def row_text(row) -> list[str]:
    return [re.sub(r'\s+', ' ', c.text.strip()) for c in row.cells]


def build_description(name: str, ingredients: list[str]) -> str:
    if not ingredients:
        return name
    return ', '.join(ingredients[:9]) + '.'


def image_order_from_docx() -> list[str]:
    ns = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    }
    with ZipFile(DOCX) as z:
        doc = etree.fromstring(z.read('word/document.xml'))
        rels = etree.fromstring(z.read('word/_rels/document.xml.rels'))
        rid_to_target = {rel.get('Id'): rel.get('Target') for rel in rels}
        order = []
        for el in doc.xpath('//w:body/*', namespaces=ns):
            for rid in el.xpath('.//a:blip/@r:embed', namespaces=ns):
                target = rid_to_target.get(rid)
                if target and target.startswith('media/'):
                    order.append('word/' + target)
        return order


def extract_media() -> dict[str, Path]:
    media_dir = OUT / 'media'
    media_dir.mkdir(parents=True, exist_ok=True)
    extracted = {}
    with ZipFile(DOCX) as z:
        for name in z.namelist():
            if name.startswith('word/media/'):
                p = media_dir / Path(name).name
                p.write_bytes(z.read(name))
                extracted[name] = p
    return extracted


def parse_products() -> tuple[list[dict], list[Product]]:
    doc = Document(str(DOCX))
    img_order = [p for p in image_order_from_docx() if not Path(p).name in {'image30.jpeg','image31.jpeg','image32.jpeg','image33.jpeg','image34.jpeg'}]
    image_idx = 0
    current_category = None
    products: list[Product] = []

    categories = [dict(id=k, **v) for k, v in CATEGORY_META.items()]

    # python-docx paragraphs/tables are separate; use document XML order to assign category per table.
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    body = doc.element.body
    table_i = 0
    for child in body.iterchildren():
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            texts = [node.text for node in child.iter() if node.tag.endswith('}t') and node.text]
            text = re.sub(r'\s+', ' ', ' '.join(texts)).strip()
            if text in SECTION_BY_HEADING:
                current_category = SECTION_BY_HEADING[text]
        elif tag == 'tbl':
            table = doc.tables[table_i]
            table_i += 1
            rows = [row_text(r) for r in table.rows]
            non_empty = [[c for c in r] for r in rows if any(c.strip() for c in r)]
            if not non_empty or current_category is None:
                continue
            first = non_empty[0]
            if current_category == 'drinks':
                for pos, r in enumerate(non_empty[1:] if non_empty[0][0].lower() == 'drink' else non_empty):
                    cells = [c for c in r if c]
                    if not cells:
                        continue
                    if len(cells) >= 2:
                        second = cells[1].strip()
                        if '-' in second:
                            name_part, price_text = second.rsplit('-', 1)
                            name = f"{cells[0]} {name_part}".strip()
                        else:
                            name = ' '.join(cells[:-1]).strip()
                            price_text = cells[-1]
                    else:
                        bits = cells[0].split('-')
                        name = bits[0].strip()
                        price_text = bits[-1]
                    name = name.replace('Coca Cola Zero', 'Coca-Cola Zero').replace('Coca Cola', 'Coca-Cola')
                    price = parse_price(price_text) or 0
                    slug = slugify(name)
                    products.append(Product(
                        id=slug, slug=slug, categoryId='drinks', name=name, nameIt=None,
                        description=f'{name} drink.', price=price,
                        sizes=[Size('regular','Regular','',price)], isVeg=True, isSpicy=False,
                        isActive=True, position=pos, imageUrl=f'/images/products/{slug}.jpg', customizations=[]
                    ))
                continue

            name = clean_name(first[0])
            if not name or name.lower() in {'ingredients', 'drink'}:
                continue
            medium, small = extract_prices(first)
            if medium is None and small is None:
                continue
            medium = medium or small or 0
            small = small or medium
            slug = slugify(name)
            included: list[str] = []
            customizations: list[Customization] = []
            add_on_section = False
            pos = 0
            for r in non_empty[1:]:
                label = r[0].strip()
                if not label or label.lower() == 'ingredients':
                    continue
                if 'suggested add-ons' in label.lower():
                    add_on_section = True
                    continue
                med_extra = parse_price(r[1] if len(r) > 1 else '')
                typ = (r[3] if len(r) > 3 else '').lower()
                is_addon = add_on_section or 'add-on' in typ
                if not is_addon:
                    included.append(label)
                # Included ingredients are removable; add-ons are optional extras.
                customizations.append(Customization(label, med_extra, not is_addon, pos))
                pos += 1
            sizes = [
                Size('regular', 'Medium', 'Medium pizza', medium),
                Size('small', 'Small', 'Small pizza', small),
            ]
            is_veg = any(x in name.lower() for x in ['vegetarian','vegan','paneer','tofu','margherita','ortolana','quattro formaggi']) or not any(x in ' '.join(included).lower() for x in ['chicken','beef','mutton','camel','veal','ham','tuna','seafood','sausage','salami','mortadella','bresaola','pepperoni','kebab'])
            is_spicy = any(x in (name + ' ' + ' '.join(included)).lower() for x in ['spicy','jalapeño','jalapeno','piccante','diavola'])
            img = img_order[image_idx] if image_idx < len(img_order) else None
            image_idx += 1
            ext = Path(img).suffix.lower() if img else '.jpg'
            if ext == '.jpeg': ext = '.jpg'
            image_url = f'/images/products/{slug}{ext}'
            products.append(Product(
                id=slug, slug=slug, categoryId=current_category, name=name, nameIt=None,
                description=build_description(name, included), price=medium, sizes=sizes,
                isVeg=is_veg, isSpicy=is_spicy, isActive=True,
                position=sum(1 for p in products if p.categoryId == current_category),
                imageUrl=image_url, customizations=customizations
            ))
    return categories, products


def copy_product_images(products: list[Product]) -> None:
    media = extract_media()
    img_order = [p for p in image_order_from_docx() if not Path(p).name in {'image30.jpeg','image31.jpeg','image32.jpeg','image33.jpeg','image34.jpeg'}]
    PUBLIC_PRODUCTS.mkdir(parents=True, exist_ok=True)
    for product, img_name in zip([p for p in products if p.categoryId != 'drinks'], img_order):
        src = media[img_name]
        dst = ROOT / 'public' / product.imageUrl.lstrip('/')
        im = ImageOps.exif_transpose(Image.open(src).convert('RGB'))
        im.thumbnail((1600, 1600))
        im.save(dst, quality=88, optimize=True)
    # Drink image mapping from doc: image30 Coca-Cola, image31 zero, image32 Fanta, image33 Sprite, image34 Water.
    drink_imgs = {
        'coca-cola': 'word/media/image30.jpeg',
        'coca-cola-zero': 'word/media/image31.jpeg',
        'fanta': 'word/media/image32.jpeg',
        'sprite': 'word/media/image33.jpeg',
        'water': 'word/media/image34.jpeg',
    }
    for slug, img_name in drink_imgs.items():
        src = media.get(img_name)
        if not src: continue
        dst = PUBLIC_PRODUCTS / f'{slug}.jpg'
        im = ImageOps.exif_transpose(Image.open(src).convert('RGB'))
        im.thumbnail((1000, 1000))
        im.save(dst, quality=88, optimize=True)


def write_data_files(categories: list[dict], products: list[Product]) -> None:
    DATA_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {'categories': categories, 'products': [asdict(p) for p in products]}
    DATA_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2))

    def js(v):
        return json.dumps(v, ensure_ascii=False, indent=2)
    cat_ts = js(categories)
    prod_ts = js([asdict(p) for p in products])
    content = f'''import type {{ Category, Product }} from "@/data/types/catalog";\n\nexport const CATEGORIES: Category[] = {cat_ts};\n\nexport const PRODUCTS: Product[] = {prod_ts};\n\nexport function getActiveProducts() {{\n  return PRODUCTS.filter((product) => product.isActive);\n}}\n\nexport function getProductBySlug(slug: string) {{\n  return PRODUCTS.find((product) => product.slug === slug && product.isActive);\n}}\n\nexport function getRelatedProducts(product: Product, limit = 3) {{\n  return PRODUCTS.filter(\n    (candidate) =>\n      candidate.isActive &&\n      candidate.categoryId === product.categoryId &&\n      candidate.slug !== product.slug,\n  ).slice(0, limit);\n}}\n'''
    MOCK_TS.write_text(content)


def apply_supabase(categories: list[dict], products: list[Product]) -> None:
    payload_path = OUT / 'catalog-payload.json'
    payload_path.write_text(json.dumps({'categories': categories, 'products': [asdict(p) for p in products]}, ensure_ascii=False))
    node = f'''
require('dotenv').config({{path:'.env.local', quiet:true}});
const fs = require('fs');
const {{ createClient }} = require('@supabase/supabase-js');
const payload = JSON.parse(fs.readFileSync({json.dumps(str(payload_path))}, 'utf8'));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {{auth:{{persistSession:false}}}});
(async()=>{{
  const cats = payload.categories.map(c => ({{id:c.id,label:c.label,description:c.description,position:c.position}}));
  let res = await supabase.from('categories').upsert(cats, {{onConflict:'id'}});
  if (res.error) throw res.error;
  const slugs = payload.products.map(p => p.slug);
  const slugFilter = '(' + slugs.map(s => JSON.stringify(s)).join(',') + ')';
  // Replace the public/admin catalog with the official DOCX menu.
  // order_items store product details as snapshots, and wishlists can safely drop removed menu items.
  res = await supabase.from('products').delete().not('slug','in', slugFilter);
  if (res.error) throw res.error;
  const categoryIds = cats.map(c => c.id);
  const categoryFilter = '(' + categoryIds.map(s => JSON.stringify(s)).join(',') + ')';
  res = await supabase.from('categories').delete().not('id','in', categoryFilter);
  if (res.error) throw res.error;
  for (const p of payload.products) {{
    const row = {{slug:p.slug, category_id:p.categoryId, name:p.name, name_it:p.nameIt, description:p.description, price_aed:p.price, is_veg:p.isVeg, is_spicy:p.isSpicy, is_active:p.isActive, position:p.position, image_url:p.imageUrl}};
    res = await supabase.from('products').upsert(row, {{onConflict:'slug'}}).select('id').single();
    if (res.error) throw res.error;
    const id = res.data.id;
    await supabase.from('product_sizes').delete().eq('product_id', id);
    await supabase.from('product_customizations').delete().eq('product_id', id);
    if (p.sizes.length) {{
      res = await supabase.from('product_sizes').insert(p.sizes.map((s, i) => ({{product_id:id, size_id:s.id, label:s.label, detail:s.detail || '', price_aed:s.price, position:i}})));
      if (res.error) throw res.error;
    }}
    if (p.customizations.length) {{
      res = await supabase.from('product_customizations').insert(p.customizations.map((c, i) => ({{product_id:id, ingredient:c.ingredient, extra_price:c.extraPrice, removable:c.removable, position:i}})));
      if (res.error) throw res.error;
    }}
  }}
  const {{count}} = await supabase.from('products').select('*', {{count:'exact', head:true}}).eq('is_active', true);
  console.log(JSON.stringify({{activeProducts:count, categories:cats.length}}, null, 2));
}})().catch(e=>{{console.error(e); process.exit(1);}});
'''
    subprocess.run(['node', '-e', node], cwd=ROOT, check=True)


def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    categories, products = parse_products()
    copy_product_images(products)
    write_data_files(categories, products)
    if '--apply-supabase' in sys.argv:
        apply_supabase(categories, products)
    print(json.dumps({'categories': len(categories), 'products': len(products), 'images': len([p for p in products if (ROOT/'public'/p.imageUrl.lstrip('/')).exists()]), 'data': str(DATA_JSON)}, indent=2))

if __name__ == '__main__':
    main()
