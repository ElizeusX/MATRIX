"""Keep reviewed product media mappings across catalog imports (no image dependencies)."""
def apply_media(product,manifest):
 if not manifest:return product
 primary=manifest.get('primary',{}).get(product['slug'])
 # A changed manufacturer photograph must be processed again, not replaced with
 # the reviewed image of an older source photograph under the same slug.
 if primary and product['imageSha256'] in (primary['sourceSha256'],primary['sha256']):
  product['image']=primary['path'];product['imageSha256']=primary['sha256']
 sources=product.get('sourceImages',product['images'])
 product['sourceImages']=sources
 product['images']=[manifest.get('gallery',{}).get(u,{}).get('path',u) for u in sources]
 return product
