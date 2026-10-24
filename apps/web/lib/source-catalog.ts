import snapshot from './source-catalog.json';
export const sourceProducts = snapshot.products;
export const sourceProduct = (slug:string) => sourceProducts.find(p=>p.slug===slug);
export const sourcePhoto = (slug:string) => {
 const p=sourceProduct(slug);
 return p ? '/'+p.image : null;
};
