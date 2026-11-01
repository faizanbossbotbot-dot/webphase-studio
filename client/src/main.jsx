import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, Menu, X, Instagram, Linkedin, Facebook, Music2,
  MessageCircle, LockKeyhole, Plus, Trash2, Upload, Save, LogOut,
  ExternalLink, CheckCircle2, RefreshCw, Download, AlertCircle
} from 'lucide-react';
import './style.css';
import staticSiteData from '../../data/site-data.json';

const API_ORIGIN = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const API = API_ORIGIN + '/api';
const WA_DEFAULT = '+923413614268';
const assetUrl = (url) => url && url.startsWith('/uploads/') && API_ORIGIN ? API_ORIGIN + url : url;

const media = {
  logo: 'https://webphase.net/assets/wp-thumb-tommy-hilfiger.webp',
  hero: 'https://webphase.net/assets/hero-poster.webp',
  teaser: 'https://webphase.net/assets/reel-teaser.mp4',
  reel1: 'https://webphase.net/assets/reels/reel-1.mp4',
  reel2: 'https://webphase.net/assets/reels/reel-2.mp4',
  reel3: 'https://webphase.net/assets/reels/reel-3.mp4',
  reel1p: 'https://webphase.net/assets/reels/reel-1-poster.webp',
  reel2p: 'https://webphase.net/assets/reels/reel-2-poster.webp',
  reel6p: 'https://webphase.net/assets/reels/reel-6-poster.webp',
  chris: 'https://webphase.net/assets/testimonials/chris-lawrence-poster.webp',
  dorota: 'https://webphase.net/assets/testimonials/dorota-pietrzak-poster.webp',
  heroLocal: ['/media/hero-01.webp','/media/hero-02.webp','/media/hero-03.webp','/media/hero-04.webp','/media/hero-05.webp'],
};

async function api(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let r;
  try {
    r = await fetch(API + url, {
      credentials: 'include',
      ...opts,
      signal: opts.signal || controller.signal,
      headers: {
        ...(typeof FormData !== 'undefined' && opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(opts.headers || {}),
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The API request timed out. Check that the backend is running and reachable.');
    throw new Error('Could not reach the WebPhase API. Check your connection and backend status.');
  } finally { clearTimeout(timeout); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  if (d && typeof d.url === 'string' && d.url.startsWith('/uploads/') && API_ORIGIN) d.url = API_ORIGIN + d.url;
  return d;
}

function waLink(number, message) {
  const n = String(number || WA_DEFAULT).replace(/\D/g, '');
  const normalized = n.startsWith('0') ? '92' + n.slice(1) : n;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// Scroll reveal hook
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function RevealSection({ children, className = '', delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal-section ${visible ? 'revealed' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
function App() {
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', type: 'Project inquiry' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [waFallback, setWaFallback] = useState(null);
  const [formError, setFormError] = useState('');
  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    api('/public').then(setData).catch(() =>
      setData(staticSiteData)
    );
  }, []);

  useEffect(() => {
    if (!data?.settings) return;
    if (data.settings.seoTitle) document.title = data.settings.seoTitle;
    if (data.settings.seoDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
      meta.content = data.settings.seoDescription;
    }
  }, [data]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (location.pathname.startsWith('/admin')) return <Admin />;

  const c = data?.content || {};
  const s = data?.settings || {};
  const socials = s.socials || {};
  const tickerWords = (c.tickerText || 'We push boundaries|try new things|we learn|we create').split('|').map(word => word.trim()).filter(Boolean).slice(0, 8);
  const heroFloats = Array.isArray(s.heroFloatImages) && s.heroFloatImages.length ? s.heroFloatImages.slice(0, 5) : media.heroLocal.map((url, i) => ({ id: `hero-${i+1}`, title: ['', 'we push boundaries', 'only a message away', '', 'we work worldwide'][i], url }));

  const contact = (msg = 'Hi WebPhase, I would like to discuss a project.') => {
    const link = waLink(s.whatsapp, msg);
    const opened = window.open(link, '_blank', 'noopener,noreferrer');
    if (!opened) setWaFallback(link);
  };

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api('/leads', { method: 'POST', body: JSON.stringify(form) });
      setFormError('');
      setSent(true);
      const msg = `Hello WebPhase! I have a ${form.type.toLowerCase()}.\nName: ${form.name}\nPhone: ${form.phone}\nEmail: ${form.email}\nMessage: ${form.message}`;
      contact(msg);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  }

  const clients = Array.isArray(data?.clientLogos) ? data.clientLogos : ['British Council','Marisa Peer','Immersive Gamebox','UNFPA','Tommy Hilfiger','SadaPay','SOL Foundation','ED & I'].map(name => ({ name, image: '', url: '' }));
  const navigation = Array.isArray(data?.navigation) ? data.navigation : [{label:'Work',href:'#work'},{label:'Studio',href:'#studio'},{label:'Services',href:'#services'},{label:'Contact',href:'#contact'}];

  return (
    <div className="site-shell">
      {/* Floating WhatsApp Fallback Banner */}
      {waFallback && (
        <div className="wa-fallback-banner">
          <span>Pop-up blocked. <a href={waFallback} target="_blank" rel="noreferrer">Open WhatsApp manually →</a></span>
          <button onClick={() => setWaFallback(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header ref={headerRef} className={`header ${scrolled ? 'header-scrolled' : ''}`}>
        <a className="brand" href="#top">
          <img src={assetUrl(s.logoImage) || '/media/brand-work.webp'} alt="WebPhase" />
        </a>
        <nav className={menu ? 'nav open' : 'nav'}>
          {navigation.map((item, i) => <a key={item.id || i} href={item.href || '#contact'} onClick={() => setMenu(false)}>{item.label}</a>)}
          <button className="nav-whatsapp" onClick={() => contact()} aria-label="Chat on WhatsApp" title="Chat on WhatsApp"><MessageCircle size={18}/></button>
          <button className="nav-cta" onClick={() => contact()}>Let's talk <ArrowUpRight size={17} /></button>
        </nav>
        <button className="mobile-menu" onClick={() => setMenu(!menu)} aria-label="Toggle menu">
          {menu ? <X /> : <Menu />}
        </button>
      </header>

      <main id="top">
        {/* ── REFERENCE-MATCHED HERO ── */}
        <section className="home-header reference-hero video-only-hero" style={s.heroBackground ? { backgroundColor: s.heroBackground } : undefined} aria-label="WebPhase showreel">
          <div className="reference-hero-video-wrap" aria-hidden="true">
            <video className="reference-hero-video" src={assetUrl(s.heroVideo) || media.teaser}
              poster={assetUrl(s.heroPoster) || media.hero} autoPlay muted loop playsInline preload="auto"
              onError={e => e.currentTarget.classList.add('hero-video-failed')} />
          </div>
        </section>

        {/* ── TICKER ── */}
        <section className="horizontal-words">
          <div className="word-track">
            {[...tickerWords, ...tickerWords].map((word, i) => <React.Fragment key={`${word}-${i}`}><span>{word}</span><i>✳</i></React.Fragment>)}
          </div>
        </section>

        {/* ── FUTURE / STUDIO ── */}
        <section className="future future-editorial" id="studio">
          <RevealSection className="future-left future-copy">
            <span className="section-kicker">01 / THE FUTURE IS NOW</span>
            <h2><span className="future-title-line">an agency built</span><span className="future-title-line">for the future.</span><em className="future-title-accent">from AI to Agents</em></h2>
            <p>{c.futureDescription || 'We combine sharp creative thinking with emerging technology to make digital work that moves businesses forward.'}</p>
            <button className="text-link" onClick={() => contact('Hi WebPhase, I would like to learn more about your studio.')}>
              Get to know us <ArrowUpRight size={18} />
            </button>
          </RevealSection>

          <RevealSection className="future-art future-collage" delay={150}>
            <div className="future-blob" aria-hidden="true" />
            <figure className="future-image future-image-main">
              <img src={assetUrl(s.futureImage) || media.heroLocal[2]} alt="Creative team exploring new ideas" loading="lazy" />
              <figcaption>Ideas into impact <span>↗</span></figcaption>
            </figure>
            <figure className="future-image future-image-small">
              <img src={media.heroLocal[3]} alt="Digital design and development in progress" loading="lazy" />
            </figure>
            <span className="future-sticker">Design<br/>×<br/>technology</span>
            <div className="future-number">01<span>—</span>04</div>
          </RevealSection>
        </section>

        {/* ── STUDIO REEL ── */}
        <section className="flick" id="studio-reel">
          <RevealSection className="dark-section-head">
            <span className="section-kicker">02 / THE PEOPLE BEHIND THE PIXELS</span>
            <h2>{c.flickTitle || 'Inside the studio'}</h2>
            <p>{c.studioDescription || 'A glimpse into the ideas, experiments and details that shape our work.'}</p>
          </RevealSection>

          <RevealSection className="flick-grid" delay={100}>
            {(Array.isArray(s.studioMedia) ? s.studioMedia.slice(0, 6) : []).map((m, i) => (
              <article className={`flick-video studio-card studio-card-${i + 1}`} key={m.id || i}>
                {m.video ? (
                  <video src={m.video} poster={m.url || media.heroLocal[i % media.heroLocal.length]} autoPlay muted loop playsInline preload="metadata" aria-label={m.title || `WebPhase studio film ${i + 1}`} />
                ) : (
                  <img src={assetUrl(m.url) || media.heroLocal[i % media.heroLocal.length]} alt={m.title || `WebPhase studio moment ${i + 1}`} loading="lazy" />
                )}
                <span>{String(i + 1).padStart(2, '0')} — {m.title || 'Studio moment'}</span>
              </article>
            ))}
          </RevealSection>
        </section>

        {/* ── SELECTED WORK ── */}
        <section className="team" id="work">
          <RevealSection className="team-heading">
            <span className="section-kicker">03 / SELECTED WORK</span>
            <h2>{c.teamTitle || 'selected work from an award-winning studio in islamabad.'}</h2>
            <p>{c.workDescription || "Good work makes a difference. Here are a few things we've made with ambitious people."}</p>
          </RevealSection>

          <div className="project-grid">
            {(data?.projects || []).map((p, i) => (
              <RevealSection
                key={p.id || i}
                delay={i * 80}
                className={`project-card project-${i % 3}`}
              >
                <article>
                  <div className="project-image" onClick={() => p.url && window.open(p.url, '_blank', 'noopener,noreferrer')} role={p.url ? 'link' : undefined} tabIndex={p.url ? 0 : undefined} onKeyDown={e => { if (p.url && (e.key === 'Enter' || e.key === ' ')) window.open(p.url, '_blank', 'noopener,noreferrer'); }}>
                    {p.image && p.image.match(/\.(mp4|webm)(?:\?|$)/i) ? (
                      <video src={assetUrl(p.image)} poster={media.reel2p} autoPlay muted loop playsInline />
                    ) : (
                      <img src={assetUrl(p.image || media.reel2p)} alt={p.name} loading="lazy" />
                    )}
                    <span className="project-arrow"><ArrowUpRight /></span>
                  </div>
                  <div className="project-meta">
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.category}</p>
                    </div>
                    <span>0{i + 1}</span>
                  </div>
                  {p.description && <p className="project-desc">{p.description}</p>}
                </article>
              </RevealSection>
            ))}
          </div>

          <div className="work-bottom">
            <span>More good things are in the making.</span>
            <button className="light-outline" onClick={() => contact('Hi WebPhase, I would like to discuss a project similar to your portfolio.')}>
              Have a project in mind? <ArrowUpRight size={17} />
            </button>
          </div>
        </section>

        {/* ── CLIENT LOGOS ── */}
        <section className="client-logos">
          <RevealSection>
            <p className="logos-label">Trusted by brands that mean business</p>
            <div className="logos-strip">
              {clients.map((client, i) => {
                const item = typeof client === 'string' ? { name: client } : client;
                const content = item.image
                  ? <img src={assetUrl(item.image)} alt={item.name || 'Client logo'} loading="lazy" />
                  : <span>{item.name || 'Client'}</span>;
                return item.url
                  ? <a key={item.id || i} className="client-name" href={item.url} target="_blank" rel="noreferrer">{content}</a>
                  : <div key={item.id || i} className="client-name">{content}</div>;
              })}
            </div>
          </RevealSection>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="flick is-testimonials">
          <RevealSection className="testimonial-top">
            <span className="section-kicker">04 / KIND WORDS, REAL PARTNERSHIPS</span>
            <h2>{c.testimonialTitle || 'Wholesale Central'}</h2>
          </RevealSection>

          <RevealSection className="testimonial-grid" delay={100}>
            {(data?.testimonials || []).map((t, i) => (
              <article className="testimonial-card" key={t.id || i}>
                {t.video && <video className="testimonial-video" src={assetUrl(t.video)} controls preload="metadata" poster={assetUrl(t.image)} />}
                <div className="quote-mark">"</div>
                <p>{t.quote}</p>
                <div className="person">
                  <img
                    src={assetUrl(t.image || (i ? media.dorota : media.chris))}
                    alt={t.name}
                    loading="lazy"
                  />
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </RevealSection>
        </section>

        {/* ── AWARDS ── */}
        <section className="awards">
          <RevealSection className="awards-copy">
            <span className="section-kicker">05 / A LITTLE RECOGNITION</span>
            <h2>{c.awardsTitle || 'good enough for google, awwwards and tommy hilfiger.'}</h2>
            <p>{c.awardsDescription || 'We care about the craft, the outcome and the people we make it for.'}</p>
          </RevealSection>
          <RevealSection className="awards-reel" delay={120}>
            <video src={assetUrl(s.awardsVideo) || media.reel2} poster={assetUrl(s.awardsPoster) || media.reel2p} autoPlay muted loop playsInline />
            <div className="award-tags">
              {(Array.isArray(data?.awards) ? data.awards : [{name:'Google Mobile Excellence Award'},{name:'Awwwards Honors Award'},{name:'BestCSS Site of the Day'}]).map((award, i) => <span key={award.id || i} className="award-tag">{award.image && <img src={assetUrl(award.image)} alt="" loading="lazy"/>}{award.name}</span>)}
            </div>
          </RevealSection>
        </section>

        {/* ── WE PUSH BOUNDARIES ── */}
        <section className="push-boundaries">
          <RevealSection className="push-inner">
            <span className="section-kicker">WHAT DRIVES US</span>
            <h2>{(c.pushTitle || 'We push\nboundaries.').split('\n').map((line,i)=><React.Fragment key={i}>{i>0&&<br/>}<em>{line}</em></React.Fragment>)}</h2>
            <div className="push-cols">
              <p>{c.pushTextOne || "We don't settle for templates or safe choices. Every project is a chance to make something that truly stands out — something that works, converts, and lasts."}</p>
              <p>{c.pushTextTwo || 'From AI-powered interfaces to brand storytelling that connects — we bring the right mix of craft and technology to every brief we take on.'}</p>
            </div>
            <button className="button-primary push-cta" onClick={() => contact()}>
              Work with us <ArrowUpRight size={19} />
            </button>
          </RevealSection>
        </section>

        {/* ── SERVICES ── */}
        <section className="services" id="services">
          <RevealSection className="services-title">
            <span className="section-kicker">06 / WHAT WE DO</span>
            <h2>{c.servicesTitle || 'how we can help:'}</h2>
            <p>{c.servicesDescription || 'From the first sketch to the final click, we bring the right people and tools together.'}</p>
          </RevealSection>

          <RevealSection className="service-list" delay={80}>
            {(data?.services || ['Web design & development', 'AI integrations & agents', 'Brand identity & strategy', 'E-commerce experiences']).map((v, i) => {
              const service = typeof v === 'string' ? { name: v } : v;
              return <button key={service.id || i} className="service-row" onClick={() => contact(`Hi WebPhase, I'm interested in ${service.name || 'your services'}. Please share more details.`)}>
                <span>0{i + 1}</span><div className="service-row-copy"><strong>{service.name || ''}</strong>{service.description && <small>{service.description}</small>}{service.image && <img src={assetUrl(service.image)} alt="" loading="lazy"/>}</div><ArrowUpRight />
              </button>;
            })}
          </RevealSection>
        </section>

        {/* ── CONTACT ── */}
        <section className="contact-section" id="contact">
          <RevealSection>
            <div>
              <span className="section-kicker">{c.contactEyebrow || 'HAVE A GOOD ONE IN MIND?'}</span>
              <h2>{(c.contactTitle || "Let's make\nsomething matter.").split('\n').map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}<em>{line}</em></React.Fragment>)}</h2>
            </div>
          </RevealSection>

          <RevealSection className="contact-right" delay={100}>
            <div className="contact-form-area">
              {sent ? (
                <div className="form-success">
                  <CheckCircle2 size={36} />
                  <h3>Message sent!</h3>
                  <p>We've received your inquiry and WhatsApp should open shortly. If not, <a href={waLink(s.whatsapp, `Hi WebPhase, I reached out via your website.`)} target="_blank" rel="noreferrer">click here to open WhatsApp</a>.</p>
                  <button className="button-primary" onClick={() => setSent(false)}>Send another</button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={submit}>
                  {formError && <p className="form-error" role="alert">{formError}</p>}
                  <div className="form-row">
                    <label>
                      <span>Full name *</span>
                      <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                    </label>
                    <label>
                      <span>Phone</span>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 300 0000000" />
                    </label>
                  </div>
                  <label>
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </label>
                  <label>
                    <span>Inquiry type</span>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option>Project inquiry</option>
                      <option>Brand strategy</option>
                      <option>AI integration</option>
                      <option>General question</option>
                    </select>
                  </label>
                  <label>
                    <span>Message *</span>
                    <textarea required rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us about your project…" />
                  </label>
                  <div className="form-submit-row">
                    <button className="button-primary" type="submit" disabled={sending}>
                      {sending ? 'Sending…' : 'Send message'} <ArrowUpRight size={17} />
                    </button>
                    <button type="button" className="contact-wa-btn" onClick={() => contact()}>
                      <MessageCircle size={17} /> WhatsApp
                    </button>
                  </div>
                </form>
              )}
            </div>
            <button className="contact-round" onClick={() => contact('Hi WebPhase, I would like to start a project.')}>
              <span>Start a project</span>
              <ArrowUpRight size={27} />
            </button>
          </RevealSection>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <a className="brand footer-brand" href="#top">
          <img src={assetUrl(data?.settings?.logoImage) || media.logo} alt="" />
          <span>webphase<span className="brand-dot">.</span></span>
        </a>
        <div className="footer-center">
          <div className="footer-big-logo">webphase</div>
          <span>{c.footerTagline || 'Independent by nature. Digital by design.'}</span>
          <div className="socials">
            {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin /></a>}
            {socials.instagram && <a href={socials.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram /></a>}
            {socials.facebook && <a href={socials.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook /></a>}
            {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><Music2 /></a>}
          </div>
        </div>
        <div className="footer-right">
          <a href="/admin">Admin login <LockKeyhole size={14} /></a>
          <span>© {new Date().getFullYear()} WebPhase Studio</span>
          <span>{s.location || 'Islamabad, Pakistan'}</span>
          {s.contactEmail && <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>}
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <button
        className="whatsapp-float"
        onClick={() => contact('Hi WebPhase! I would like to discuss a project.')}
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle />
        <span>Let's chat</span>
      </button>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function Admin() {
  const [status, setStatus] = useState(null);
  const [logged, setLogged] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('content');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const authStatus = await api('/auth/status');
        if (!active) return;
        setStatus(authStatus);
        if (authStatus.authenticated) {
          try {
            const d = await api('/admin');
            if (!active) return;
            setData({
              settings: { whatsapp: WA_DEFAULT, socials: {}, seoTitle: '', seoDescription: '', ...d.settings },
              content: d.content || {},
              projects: Array.isArray(d.projects) ? d.projects : [],
              services: Array.isArray(d.services) ? d.services : [],
              testimonials: Array.isArray(d.testimonials) ? d.testimonials : [],
              clientLogos: Array.isArray(d.clientLogos) ? d.clientLogos : [],
              awards: Array.isArray(d.awards) ? d.awards : [],
              navigation: Array.isArray(d.navigation) ? d.navigation : [],
              leads: Array.isArray(d.leads) ? d.leads : [],
            });
            setLogged(true);
          } catch (err) {
            if (active) showNotice(`Your session could not be restored: ${err.message}. Please sign in again.`, 'error');
          }
        }
      } catch (err) {
        if (active) {
          setStatus({ configured: false, unavailable: true });
          setNotice(`Admin setup needs the live backend. This Netlify site has no API connection yet: ${err.message}. Deploy the included Render service, then set VITE_API_BASE in Netlify and redeploy.`, 'error');
          setNoticeType('error');
        }
      }
    })();
    return () => { active = false; };
  }, []);

  function showNotice(msg, type = 'success') {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(''), 5000);
  }

  async function enter(e) {
    e.preventDefault();
    if (!status?.configured && password !== confirm) {
      showNotice('Passwords do not match.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api(status?.configured ? '/auth/login' : '/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      // Load protected data before switching views to avoid a null-data render.
      const d = await api('/admin');
      setData({
        settings: { whatsapp: WA_DEFAULT, socials: {}, seoTitle: '', seoDescription: '', ...d.settings },
        content: d.content || {},
        projects: Array.isArray(d.projects) ? d.projects : [],
        services: Array.isArray(d.services) ? d.services : [],
        testimonials: Array.isArray(d.testimonials) ? d.testimonials : [],
        clientLogos: Array.isArray(d.clientLogos) ? d.clientLogos : [],
        awards: Array.isArray(d.awards) ? d.awards : [],
        navigation: Array.isArray(d.navigation) ? d.navigation : [],
        leads: Array.isArray(d.leads) ? d.leads : [],
      });
      setLogged(true);
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await api('/admin', {
        method: 'PUT',
        body: JSON.stringify({
          settings: data.settings,
          content: data.content,
          projects: data.projects,
          services: data.services,
          testimonials: data.testimonials,
          clientLogos: data.clientLogos,
          awards: data.awards,
          navigation: data.navigation,
        }),
      });
      showNotice('All changes saved successfully.');
    } catch (e) {
      showNotice(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file) {
    if (file.size > 15 * 1024 * 1024) {
      showNotice('File too large. Max 15 MB.', 'error');
      return null;
    }
    const f = new FormData();
    f.append('file', file);
    try {
      const res = await api('/upload', { method: 'POST', body: f });
      return res.url;
    } catch (e) {
      showNotice(e.message, 'error');
      return null;
    }
  }

  async function doBackup() {
    try {
      const res = await fetch(API + '/admin/backup', { credentials: 'include' });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webphase-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('Backup downloaded.');
    } catch (e) {
      showNotice(e.message, 'error');
    }
  }

  async function doRestore(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api('/admin/restore', { method: 'POST', body: JSON.stringify(parsed) });
      const d = await api('/admin');
      setData({
        settings: { whatsapp: WA_DEFAULT, socials: {}, ...d.settings },
        content: d.content || {},
        projects: d.projects || [],
        services: d.services || [],
        testimonials: d.testimonials || [],
        clientLogos: d.clientLogos || [],
        awards: d.awards || [],
        navigation: d.navigation || [],
        leads: d.leads || [],
      });
      showNotice('Data restored from backup.');
    } catch (e) {
      showNotice('Restore failed: ' + e.message, 'error');
    }
  }

  if (!status) return <div className="admin-loading" role="status"><RefreshCw className="spin" size={30} /><p>Connecting to the WebPhase API…</p>{notice && <p className="error-text">{notice}</p>}<a href="/">Back to website</a></div>;

  if (!logged) {
    return (
      <div className="admin-auth">
        <a href="/" className="back-home">← Back to website</a>
        <form className="auth-card" onSubmit={enter}>
          <div className="auth-icon"><LockKeyhole /></div>
          <span className="section-kicker">WEBPHASE / OWNER ACCESS</span>
          <h1>{status.configured ? 'Welcome back.' : 'Create your admin password.'}</h1>
          <p>{status.configured
            ? 'Sign in to manage your website.'
            : 'Set a strong password to secure your dashboard. Use at least 10 characters.'}</p>
          <input
            type="password"
            minLength={status.configured ? 1 : 10}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={status.configured ? 'Admin password' : 'Choose a password (10+ chars)'}
          />
          {!status.configured && (
            <input
              type="password"
              minLength={10}
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm password"
              style={{ marginTop: 10 }}
            />
          )}
          <button className="button-primary" disabled={busy}>
            {busy ? 'Please wait…' : status.configured ? 'Sign in' : 'Create admin account'} <ArrowUpRight size={17} />
          </button>
          {notice && <small className={`notice-text ${noticeType === 'error' ? 'error-text' : 'success-text'}`}>{notice}</small>}
        </form>
      </div>
    );
  }

  if (logged && !data) {
    return <div className="admin-loading" role="status"><RefreshCw className="spin" size={30} /><p>Loading dashboard…</p>{notice && <p className="error-text">{notice}</p>}</div>;
  }

  const update = (key, value) => setData(d => ({ ...d, [key]: value }));

  const contentField = (key, label, area = false) => (
    <label className="admin-field" key={key}>
      {label}
      {area
        ? <textarea value={data.content[key] || ''} onChange={e => update('content', { ...data.content, [key]: e.target.value })} />
        : <input value={data.content[key] || ''} onChange={e => update('content', { ...data.content, [key]: e.target.value })} />}
    </label>
  );

  const tabs = [
    ['content', 'Website Content'],
    ['projects', 'Selected Work'],
    ['services', 'Services'],
    ['testimonials', 'Testimonials'],
    ['media', 'Hero & Studio Media'],
    ['logos', 'Client Logos'],
    ['awards', 'Awards'],
    ['navigation', 'Navigation'],
    ['settings', 'Settings & Socials'],
    ['leads', 'Customer Inquiries'],
    ['backup', 'Backup & Restore'],
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          <img src={assetUrl(data?.settings?.logoImage) || media.logo} alt="" />
          <span>webphase<span className="brand-dot">.</span></span>
        </a>
        <span className="admin-overline">OWNER DASHBOARD</span>
        {tabs.map(([id, label]) => (
          <button
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
            key={id}
          >
            {label}
          </button>
        ))}
        <button
          className="sidebar-exit"
          onClick={async () => { try { await api('/auth/logout', { method: 'POST' }); } catch (err) { showNotice(err.message, 'error'); return; } location.href = '/admin'; }}
        >
          <LogOut size={16} /> Log out
        </button>
        <a className="view-site" href="/" target="_blank" rel="noreferrer">
          View live website <ExternalLink size={14} />
        </a>
      </aside>

      <main className="admin-main">
        <div className="admin-top">
          <div>
            <span className="section-kicker">WEBPHASE / CONTROL CENTER</span>
            <h1>{tabs.find(([id]) => id === tab)?.[1] || ''}</h1>
          </div>
          {tab !== 'leads' && tab !== 'backup' && (
            <button className="button-primary" onClick={save} disabled={busy}>
              <Save size={17} /> {busy ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>

        {notice && (
          <div className={`admin-notice ${noticeType === 'error' ? 'notice-error' : ''}`}>
            {noticeType === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {notice}
          </div>
        )}

        {tab === 'content' && <div className="admin-summary-grid">
          <div className="admin-summary-card"><span>Projects</span><strong>{data.projects.length}</strong></div>
          <div className="admin-summary-card"><span>Inquiries</span><strong>{data.leads.length}</strong></div>
          <div className="admin-summary-card"><span>Services</span><strong>{data.services.length}</strong></div>
          <div className="admin-summary-card"><span>Testimonials</span><strong>{data.testimonials.length}</strong></div>
          <div className="admin-summary-card admin-summary-wide"><span>Recent inquiries</span>{data.leads.slice(0,3).length ? data.leads.slice(0,3).map(l=><p key={l.id}><strong>{l.name}</strong> — {l.message.slice(0,90)}{l.message.length>90?'…':''}</p>) : <p>No inquiries received yet.</p>}</div>
        </div>}

        {/* CONTENT TAB */}
        {tab === 'content' && (
          <div className="admin-panel">
            <h2>Hero & page sections</h2>
            <div className="admin-fields">
              {contentField('heroEyebrow', 'Hero eyebrow')}
              {contentField('heroTitle', 'Hero headline', true)}
              {contentField('heroSub', 'Hero description', true)}
              {contentField('tickerText', 'Moving ticker phrases (separate each with |)', true)}
              {contentField('futureTitle', 'Future section headline', true)}
              {contentField('flickTitle', 'Studio reel title')}
              {contentField('teamTitle', 'Selected work headline', true)}
              {contentField('testimonialTitle', 'Testimonials heading')}
              {contentField('awardsTitle', 'Awards headline', true)}
              {contentField('servicesTitle', 'Services heading')}
              {contentField('futureDescription', 'Future section description', true)}
              {contentField('studioDescription', 'Studio section description', true)}
              {contentField('workDescription', 'Selected work description', true)}
              {contentField('contactTitle', 'Contact heading', true)}
              {contentField('footerTagline', 'Footer tagline')}
              {contentField('awardsDescription', 'Awards section description', true)}
              {contentField('pushTitle', 'We Push Boundaries heading', true)}
              {contentField('pushTextOne', 'We Push Boundaries paragraph 1', true)}
              {contentField('pushTextTwo', 'We Push Boundaries paragraph 2', true)}
              {contentField('servicesDescription', 'Services section description', true)}
              {contentField('contactEyebrow', 'Contact eyebrow')}
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
        {tab === 'projects' && (
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>Portfolio projects</h2>
              <button
                className="small-dark"
                onClick={() => update('projects', [...data.projects, {
                  id: crypto.randomUUID(),
                  name: 'New project',
                  category: 'Category',
                  description: 'Project description',
                  image: media.reel2p,
                }])}
              >
                <Plus size={16} /> Add project
              </button>
            </div>
            {data.projects.map((p, i) => (
              <div className="edit-card" key={p.id || i}>
                <div className="edit-card-head">
                  <strong>Project {i + 1}: {p.name}</strong>
                  <button
                    className="icon-danger"
                    onClick={() => update('projects', data.projects.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="admin-fields">
                  <label className="admin-field">
                    Project name
                    <input value={p.name} onChange={e => update('projects', data.projects.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  </label>
                  <label className="admin-field">
                    Category
                    <input value={p.category} onChange={e => update('projects', data.projects.map((x, j) => j === i ? { ...x, category: e.target.value } : x))} />
                  </label>
                  <label className="admin-field full">
                    Description
                    <textarea value={p.description || ''} onChange={e => update('projects', data.projects.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  </label>
                  <label className="admin-field full">Project website URL<input value={p.url || ''} onChange={e => update('projects', data.projects.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://client-website.com" /></label>
                  <label className="admin-field full">
                    Image / Video URL
                    <input value={p.image || ''} onChange={e => update('projects', data.projects.map((x, j) => j === i ? { ...x, image: e.target.value } : x))} placeholder="https://... or /uploads/..." />
                  </label>
                  <div className="admin-field full">
                    <span className="upload-btn-label">Upload image or video</span>
                    <label className="upload-label">
                      <Upload size={14} /> Choose file (max 15 MB)
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={async e => {
                          if (!e.target.files[0]) return;
                          const url = await uploadFile(e.target.files[0]);
                          if (url) update('projects', data.projects.map((x, j) => j === i ? { ...x, image: url } : x));
                        }}
                      />
                    </label>
                    {p.image && (
                      <div className="media-preview">
                        {p.image.match(/\.(mp4|webm)(?:\?|$)/i)
                          ? <video src={p.image} style={{ maxHeight: 120, borderRadius: 8 }} controls />
                          : <img src={assetUrl(p.image)} alt="" style={{ maxHeight: 120, borderRadius: 8 }} />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SERVICES TAB */}
        {tab === 'services' && (
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>Services list</h2>
              <button className="small-dark" onClick={() => update('services', [...data.services, {id:crypto.randomUUID(),name:'New service',description:'',image:''}])}>
                <Plus size={16} /> Add service
              </button>
            </div>
            {data.services.map((v, i) => { const service = typeof v === 'string' ? {id:`service-${i}`,name:v,description:'',image:''} : v; return (
              <div className="edit-card" key={service.id || i}><div className="edit-card-head"><strong>{service.name || `Service ${i+1}`}</strong><button className="icon-danger" onClick={() => update('services', data.services.filter((_, j) => j !== i))}><Trash2 size={16} /></button></div>
                <div className="admin-fields"><label className="admin-field">Service name<input value={service.name || ''} onChange={e => update('services', data.services.map((x,j)=>j===i?{...(typeof x==='string'?{name:x}:x),name:e.target.value}:x))}/></label>
                <label className="admin-field">Image URL<input value={service.image || ''} onChange={e => update('services', data.services.map((x,j)=>j===i?{...(typeof x==='string'?{name:x}:x),image:e.target.value}:x))}/></label>
                <label className="admin-field full">Description<textarea value={service.description || ''} onChange={e => update('services', data.services.map((x,j)=>j===i?{...(typeof x==='string'?{name:x}:x),description:e.target.value}:x))}/></label>
                <div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload service image<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('services',data.services.map((x,j)=>j===i?{...(typeof x==='string'?{name:x}:x),image:url}:x));}}/></label></div></div>
              </div>); })}
          </div>
        )}

        {/* TESTIMONIALS TAB */}
        {tab === 'testimonials' && (
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>Client testimonials</h2>
              <button
                className="small-dark"
                onClick={() => update('testimonials', [...data.testimonials, {
                  name: 'Client name',
                  role: 'Role / Company',
                  quote: 'Client feedback goes here.',
                  image: media.chris,
                }])}
              >
                <Plus size={16} /> Add testimonial
              </button>
            </div>
            {data.testimonials.map((t, i) => (
              <div className="edit-card" key={i}>
                <div className="edit-card-head">
                  <strong>Testimonial {i + 1}: {t.name}</strong>
                  <button className="icon-danger" onClick={() => update('testimonials', data.testimonials.filter((_, j) => j !== i))}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="admin-fields">
                  <label className="admin-field">
                    Name
                    <input value={t.name} onChange={e => update('testimonials', data.testimonials.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  </label>
                  <label className="admin-field">
                    Role
                    <input value={t.role} onChange={e => update('testimonials', data.testimonials.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                  </label>
                  <label className="admin-field full">
                    Quote
                    <textarea value={t.quote} onChange={e => update('testimonials', data.testimonials.map((x, j) => j === i ? { ...x, quote: e.target.value } : x))} />
                  </label>
                  <label className="admin-field full">
                    Photo URL
                    <input value={t.image || ''} onChange={e => update('testimonials', data.testimonials.map((x, j) => j === i ? { ...x, image: e.target.value } : x))} />
                  </label>
                  <label className="admin-field full">Testimonial video URL<input value={t.video || ''} onChange={e => update('testimonials',data.testimonials.map((x,j)=>j===i?{...x,video:e.target.value}:x))}/></label>
                  <div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload photo or testimonial video<input type="file" accept="image/*,video/mp4,video/webm" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('testimonials',data.testimonials.map((x,j)=>j===i?{...x,[f.type.startsWith('video/')?'video':'image']:url}:x));}}/></label>{t.video && <video src={assetUrl(t.video)} controls style={{maxWidth:'100%',maxHeight:180,marginTop:10}}/>}</div>
                  <div className="admin-field full">
                    <label className="upload-label">
                      <Upload size={14} /> Upload photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async e => {
                          if (!e.target.files[0]) return;
                          const url = await uploadFile(e.target.files[0]);
                          if (url) update('testimonials', data.testimonials.map((x, j) => j === i ? { ...x, image: url } : x));
                        }}
                      />
                    </label>
                    {t.image && <img src={assetUrl(t.image)} alt="" style={{ maxHeight: 80, borderRadius: '50%', marginTop: 8 }} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HERO AND STUDIO MEDIA */}
        {tab === 'media' && <div className="admin-panel">
          <h2>Hero and studio media</h2>
          <p className="admin-help">Upload videos or posters, or paste an existing public URL. Files are saved by the backend in its uploads folder.</p>
          <div className="admin-fields">
            <label className="admin-field">Hero background color<input type="color" value={data.settings.heroBackground || '#f0ebe6'} onChange={e=>update('settings',{...data.settings,heroBackground:e.target.value})}/></label>
            <label className="admin-field full">Hero video URL<input value={data.settings.heroVideo || ''} onChange={e => update('settings', {...data.settings, heroVideo:e.target.value})} placeholder="/uploads/hero.mp4 or https://…" /></label>
            <label className="admin-field full">Hero poster / banner image URL<input value={data.settings.heroPoster || ''} onChange={e => update('settings', {...data.settings, heroPoster:e.target.value})} placeholder="/uploads/hero.webp or https://…" /></label>
            <div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload hero video or image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={async e=>{const f=e.target.files?.[0]; if(!f)return; const url=await uploadFile(f); if(url){const key=f.type.startsWith('video/')?'heroVideo':'heroPoster'; update('settings',{...data.settings,[key]:url});}}}/></label></div>
            <label className="admin-field full">Header/footer logo URL<input value={data.settings.logoImage || ''} onChange={e=>update('settings',{...data.settings,logoImage:e.target.value})}/></label>
            <div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload logo image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('settings',{...data.settings,logoImage:url});}}/></label></div>
            <label className="admin-field full">Future-section collage image URL<input value={data.settings.futureImage || ''} onChange={e=>update('settings',{...data.settings,futureImage:e.target.value})}/></label>
            <div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload future-section image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('settings',{...data.settings,futureImage:url});}}/></label></div>
            <label className="admin-field full">Awards background video URL<input value={data.settings.awardsVideo || ''} onChange={e=>update('settings',{...data.settings,awardsVideo:e.target.value})}/></label>
            <label className="admin-field full">Awards poster URL<input value={data.settings.awardsPoster || ''} onChange={e=>update('settings',{...data.settings,awardsPoster:e.target.value})}/></label>
            <div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload awards video or poster<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('settings',{...data.settings,[f.type.startsWith('video/')?'awardsVideo':'awardsPoster']:url});}}/></label></div>
          </div>
          <div className="panel-heading" style={{marginTop:28}}><h2>Hero floating image collage</h2><button className="small-dark" onClick={()=>update('settings',{...data.settings,heroFloatImages:[...(data.settings.heroFloatImages||[]),{id:crypto.randomUUID(),title:'New label',url:''}].slice(0,5)})} disabled={(data.settings.heroFloatImages||[]).length>=5}><Plus size={16}/> Add image</button></div>
          {(data.settings.heroFloatImages||[]).map((item,i)=><div className="edit-card" key={item.id||i}><div className="edit-card-head"><strong>Floating image {i+1}</strong><button className="icon-danger" onClick={()=>update('settings',{...data.settings,heroFloatImages:data.settings.heroFloatImages.filter((_,j)=>j!==i)})}><Trash2 size={16}/></button></div><div className="admin-fields"><label className="admin-field">Floating label<input value={item.title||''} onChange={e=>update('settings',{...data.settings,heroFloatImages:data.settings.heroFloatImages.map((x,j)=>j===i?{...x,title:e.target.value}:x)})}/></label><label className="admin-field">Image URL<input value={item.url||''} onChange={e=>update('settings',{...data.settings,heroFloatImages:data.settings.heroFloatImages.map((x,j)=>j===i?{...x,url:e.target.value}:x)})}/></label><div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload floating image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('settings',{...data.settings,heroFloatImages:data.settings.heroFloatImages.map((x,j)=>j===i?{...x,url}:x)});}}/></label></div></div></div>)}
          <div className="panel-heading" style={{marginTop:28}}><h2>Studio media cards</h2><button className="small-dark" onClick={()=>update('settings',{...data.settings,studioMedia:[...(data.settings.studioMedia||[]),{id:crypto.randomUUID(),title:'Studio moment',url:''}]})}><Plus size={16}/> Add media</button></div>
          {(data.settings.studioMedia||[]).map((m,i)=><div className="edit-card" key={m.id||i}><div className="edit-card-head"><strong>Studio media {i+1}</strong><button className="icon-danger" onClick={()=>update('settings',{...data.settings,studioMedia:data.settings.studioMedia.filter((_,j)=>j!==i)})}><Trash2 size={16}/></button></div><div className="admin-fields"><label className="admin-field">Card title<input value={m.title||''} onChange={e=>update('settings',{...data.settings,studioMedia:data.settings.studioMedia.map((x,j)=>j===i?{...x,title:e.target.value}:x)})}/></label><label className="admin-field">Media URL<input value={m.url||''} onChange={e=>update('settings',{...data.settings,studioMedia:data.settings.studioMedia.map((x,j)=>j===i?{...x,url:e.target.value}:x)})}/></label><div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload image/video<input type="file" accept="image/*,video/mp4,video/webm" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('settings',{...data.settings,studioMedia:data.settings.studioMedia.map((x,j)=>j===i?{...x,url}:x)});}}/></label></div></div></div>)}
        </div>}

        {/* CLIENT LOGOS */}
        {tab === 'logos' && <div className="admin-panel"><div className="panel-heading"><h2>Client logos</h2><button className="small-dark" onClick={()=>update('clientLogos',[...data.clientLogos,{id:crypto.randomUUID(),name:'New client',image:'',url:''}])}><Plus size={16}/> Add logo</button></div>
          {data.clientLogos.map((item,i)=><div className="edit-card" key={item.id||i}><div className="edit-card-head"><strong>{item.name||`Client ${i+1}`}</strong><button className="icon-danger" onClick={()=>update('clientLogos',data.clientLogos.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div><div className="admin-fields"><label className="admin-field">Client name<input value={item.name||''} onChange={e=>update('clientLogos',data.clientLogos.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></label><label className="admin-field">Website URL<input value={item.url||''} onChange={e=>update('clientLogos',data.clientLogos.map((x,j)=>j===i?{...x,url:e.target.value}:x))}/></label><label className="admin-field full">Logo image URL<input value={item.image||''} onChange={e=>update('clientLogos',data.clientLogos.map((x,j)=>j===i?{...x,image:e.target.value}:x))}/></label><div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload logo<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('clientLogos',data.clientLogos.map((x,j)=>j===i?{...x,image:url}:x));}}/></label></div></div></div>)}
        </div>}

        {/* AWARDS */}
        {tab === 'awards' && <div className="admin-panel"><div className="panel-heading"><h2>Awards & achievements</h2><button className="small-dark" onClick={()=>update('awards',[...data.awards,{id:crypto.randomUUID(),name:'New award',issuer:'',year:'',url:''}])}><Plus size={16}/> Add award</button></div>
          {data.awards.map((item,i)=><div className="edit-card" key={item.id||i}><div className="edit-card-head"><strong>{item.name||`Award ${i+1}`}</strong><button className="icon-danger" onClick={()=>update('awards',data.awards.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div><div className="admin-fields"><label className="admin-field">Award name<input value={item.name||''} onChange={e=>update('awards',data.awards.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></label><label className="admin-field">Issuer<input value={item.issuer||''} onChange={e=>update('awards',data.awards.map((x,j)=>j===i?{...x,issuer:e.target.value}:x))}/></label><label className="admin-field">Year<input value={item.year||''} onChange={e=>update('awards',data.awards.map((x,j)=>j===i?{...x,year:e.target.value}:x))}/></label><label className="admin-field">Link<input value={item.url||''} onChange={e=>update('awards',data.awards.map((x,j)=>j===i?{...x,url:e.target.value}:x))}/></label><label className="admin-field full">Award image URL<input value={item.image||''} onChange={e=>update('awards',data.awards.map((x,j)=>j===i?{...x,image:e.target.value}:x))}/></label><div className="admin-field full"><label className="upload-label"><Upload size={14}/> Upload award image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await uploadFile(f);if(url)update('awards',data.awards.map((x,j)=>j===i?{...x,image:url}:x));}}/></label></div></div></div>)}
        </div>}

        {/* NAVIGATION */}
        {tab === 'navigation' && <div className="admin-panel"><div className="panel-heading"><h2>Navigation links</h2><button className="small-dark" onClick={()=>update('navigation',[...data.navigation,{id:crypto.randomUUID(),label:'New link',href:'#contact'}])}><Plus size={16}/> Add link</button></div>
          {data.navigation.map((item,i)=><div className="edit-card" key={item.id||i}><div className="admin-fields"><label className="admin-field">Label<input value={item.label||''} onChange={e=>update('navigation',data.navigation.map((x,j)=>j===i?{...x,label:e.target.value}:x))}/></label><label className="admin-field">Link / section<input value={item.href||''} onChange={e=>update('navigation',data.navigation.map((x,j)=>j===i?{...x,href:e.target.value}:x))}/></label><div><button className="icon-danger" onClick={()=>update('navigation',data.navigation.filter((_,j)=>j!==i))}><Trash2 size={16}/> Delete</button></div></div></div>)}
        </div>}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="admin-panel">
            <h2>Contact & social accounts</h2>
            <PasswordChange showNotice={showNotice} />
            <div className="admin-fields">
              <label className="admin-field full">Contact email<input value={data.settings.contactEmail || ''} onChange={e => update('settings', { ...data.settings, contactEmail: e.target.value })} /></label>
              <label className="admin-field full">Office / location<input value={data.settings.location || ''} onChange={e => update('settings', { ...data.settings, location: e.target.value })} /></label>
              <label className="admin-field full">
                WhatsApp number
                <input
                  value={data.settings.whatsapp}
                  onChange={e => update('settings', { ...data.settings, whatsapp: e.target.value })}
                />
                <small>All contact buttons use this. Format: 03413614268 or 923413614268</small>
              </label>
              {['linkedin', 'instagram', 'facebook', 'tiktok'].map(k => (
                <label className="admin-field" key={k}>
                  {k[0].toUpperCase() + k.slice(1)} profile URL
                  <input
                    placeholder={`https://${k}.com/your-profile`}
                    value={data.settings.socials?.[k] || ''}
                    onChange={e => update('settings', { ...data.settings, socials: { ...data.settings.socials, [k]: e.target.value } })}
                  />
                </label>
              ))}
              <label className="admin-field full">
                SEO page title
                <input value={data.settings.seoTitle || ''} onChange={e => update('settings', { ...data.settings, seoTitle: e.target.value })} />
              </label>
              <label className="admin-field full">
                SEO meta description
                <textarea value={data.settings.seoDescription || ''} onChange={e => update('settings', { ...data.settings, seoDescription: e.target.value })} />
              </label>
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {tab === 'leads' && (
          <div className="admin-panel">
            <div className="panel-heading">
              <h2>Incoming inquiries · {data.leads?.length || 0}</h2>
              <button
                className="small-dark"
                onClick={async () => {
                  const d = await api('/admin');
                  setData(prev => ({ ...prev, leads: d.leads || [] }));
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {!data.leads?.length ? (
              <p className="empty-leads">No inquiries yet. Customer messages will appear here.</p>
            ) : (
              data.leads.map(l => (
                <div className="lead-card" key={l.id}>
                  <div className="lead-head">
                    <div>
                      <strong>{l.name}</strong>
                      <span>{l.type} · {new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                    <select
                      value={l.status}
                      onChange={async e => {
                        await api(`/leads/${l.id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
                        setData(d => ({ ...d, leads: d.leads.map(x => x.id === l.id ? { ...x, status: e.target.value } : x) }));
                      }}
                    >
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Qualified</option>
                      <option>Closed</option>
                    </select>
                  </div>
                  <p>{l.message}</p>
                  <div className="lead-details">
                    {l.phone && <span>📱 {l.phone}</span>}
                    {l.email && <span>📧 {l.email}</span>}
                  </div>
                  <div className="lead-actions">
                    <a
                      href={waLink(data.settings.whatsapp, `Hello ${l.name}, thanks for contacting WebPhase. Regarding: ${l.message}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Reply on WhatsApp <ArrowUpRight size={14} />
                    </a>
                    <button
                      onClick={async () => {
                        await api(`/leads/${l.id}`, { method: 'DELETE' });
                        setData(d => ({ ...d, leads: d.leads.filter(x => x.id !== l.id) }));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BACKUP TAB */}
        {tab === 'backup' && (
          <div className="admin-panel">
            <h2>Backup & Restore</h2>
            <p style={{ color: '#666', marginBottom: 30 }}>
              Download a full backup of all your website data, or restore from a previously saved backup file.
            </p>
            <div className="backup-actions">
              <div className="backup-card">
                <Download size={28} />
                <h3>Download backup</h3>
                <p>Save all your content, projects, services, testimonials and settings to a JSON file.</p>
                <button className="button-primary" onClick={doBackup}>
                  <Download size={16} /> Download backup
                </button>
              </div>
              <div className="backup-card">
                <Upload size={28} />
                <h3>Restore from backup</h3>
                <p>Upload a previously downloaded backup file to restore your website data.</p>
                <label className="upload-restore-btn">
                  <Upload size={16} /> Choose backup file
                  <input
                    type="file"
                    accept=".json"
                    onChange={e => { if (e.target.files[0]) doRestore(e.target.files[0]); }}
                  />
                </label>
                <small style={{ color: '#e55', marginTop: 10, display: 'block' }}>
                  ⚠ Restoring will overwrite your current website data.
                </small>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PasswordChange({ showNotice }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="password-change" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await api('/auth/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})}); showNotice('Password changed. Please log in again.'); await api('/auth/logout',{method:'POST'}); location.href='/admin'; } catch(err) { showNotice(err.message,'error'); } finally { setBusy(false); } }}><h3>Change admin password</h3><div className="admin-fields"><label className="admin-field">Current password<input type="password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label className="admin-field">New password (10+ characters)<input type="password" minLength={10} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label></div><button className="small-dark" disabled={busy}>{busy?'Changing…':'Change password'}</button></form>;
}

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('WebPhase render error:', error, info); }
  render() {
    if (this.state.error) return <main style={{minHeight:'100vh',padding:'48px',background:'#f0ebe6',color:'#202020',fontFamily:'sans-serif'}}><h1>Something went wrong</h1><p>The page hit a rendering error. Your saved data has not been deleted.</p><pre style={{whiteSpace:'pre-wrap',background:'#fff',padding:16,borderRadius:8}}>{this.state.error.message}</pre><button onClick={() => location.reload()}>Reload page</button></main>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
