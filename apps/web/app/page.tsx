const categories = ["Дивани", "Крісла", "Столи", "Стільці"];

export default function Home() {
 return <main>
  <header className="nav"><a className="logo" href="/">MATRIX<span>.</span></a><nav><a href="#collection">Колекції</a><a href="#about">Про нас</a></nav><span>UA / EN</span></header>
  <section className="hero"><div className="eyebrow">DESIGNED FOR LIVING</div><h1>Простір, у якому<br/><em>хочеться жити.</em></h1><p>Меблі, що поєднують сучасну естетику, комфорт і характер вашого дому.</p><a className="cta" href="#collection">Дослідити колекції <span>↗</span></a><div className="heroMark">M.</div></section>
  <section id="collection" className="collection"><div className="sectionTop"><div><div className="eyebrow">EXPLORE MATRIX</div><h2>Колекції</h2></div><span>01 — 04</span></div><div className="cards">{categories.map((category,i)=><article className="category" key={category}><span>0{i+1}</span><h3>{category}</h3><span className="arrow">↗</span></article>)}</div></section>
  <section id="about" className="about"><div className="eyebrow">OUR PHILOSOPHY</div><h2>Дім — це більше,<br/>ніж просто місце.</h2><p>Ми віримо в речі, які залишаються актуальними роками. Відкрийте нову мову комфорту з MATRIX.</p></section>
  <footer><strong>MATRIX.</strong><span>Thoughtfully made for everyday living.</span></footer>
 </main>;
}
