(() => {
"use strict";
const C = window.LI_CONFIG, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => "₹" + Math.round(Number(n)).toLocaleString("en-IN");
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const pad = (n) => String(n).padStart(2, "0");
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const hm12 = (t) => { const h = +t.slice(0, 2); return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? "AM" : "PM"}`; };
const main = $("#main");

const STUDIOS = [
  { name: "Chennai", tag: "Head office", addr: "Madha Street, Mappedu, Tiruvanchery, Selaiyur, Chennai", phone: "8754449459", wa: "918754449459", mail: "lifeimpressions.chennai@gmail.com", who: "Keerthi" },
  { name: "Salem", tag: "Franchise studio", addr: "1st Floor, Srinivasa Complex, 4/2-307, Vinayagar Koil St, Opp. Valampuri, Guptha Nagar, Angammal Colony, Salem 636009", phone: "8072740743", wa: "918072740743", mail: "lifeimpressions.salem@gmail.com", who: "Prabhavathi" },
  { name: "Tirunelveli", tag: "Franchise studio", addr: "118T, B4, NGO B Colony, SBI Colony, Tirunelveli 627007", phone: "8610061063", wa: "918610061063", mail: "lifeimpressions.tirunelveli@gmail.com", who: "Meenakshi Bala" },
];
const CATS = [
  ["Baby", /baby|infant/i, "Tiny hands and feet, kept forever."], ["Couples", /couple|marriage/i, "Two hands, one keepsake."],
  ["Family & parents", /family|parent/i, "Everyone in one frame."], ["Pregnancy, face & lip", /belly|face|lip/i, "Moments you want to remember."],
  ["Pets & props", /pet|prop/i, "Paws, props and personality."], ["Gifts & concepts", /voucher|clock|collectible/i, "Give the gift of a memory."],
];
const catOf = (name) => (CATS.find((c) => c[1].test(name)) || ["More"])[0];

// ---------- api ----------
const api = async (path, opts) => {
  let r; try { r = await fetch(C.API + path, opts); } catch { throw new Error("We could not reach the booking system. Please check your internet or call us."); }
  const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) { const e = new Error(j.error || "Something went wrong."); e.data = j; throw e; } return j;
};
const post = (p, b) => api(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
let CAT = null;
const catalog = async () => CAT || (CAT = await api("/catalog"));

// ---------- tiny view helpers ----------
// Social icons (inline SVG, they take the text colour)
const ICON_IG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>`;
const ICON_FB = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.6V13h2.7v8h3.2z"/></svg>`;
const socials = (cls = "") => `<span class="social ${cls}"><a href="${C.INSTAGRAM}" target="_blank" rel="noopener" aria-label="Lifeimpressions on Instagram" title="Instagram">${ICON_IG}</a><a href="${C.FACEBOOK}" target="_blank" rel="noopener" aria-label="Lifeimpressions on Facebook" title="Facebook">${ICON_FB}</a></span>`;
// Service photos (hosted on the existing Wix media library). Keyed by service name.
const SVC_IMG = {
  "baby casting - single hand or foot": "a80f9255cda74118b6ae0c7e0a13b2c4~mv2.jpeg", "baby casting - single - standard": "fa3d1699926e43f1a8b016171a9711f5~mv2_d_1536_2048_s_2.jpg",
  "baby casting - double - standard": "7500f652956042cca6cf9736cbc2f96a~mv2.jpg", "baby casting - double - customized": "9fcfa9fb34fe4796be1cbd280bb8f708~mv2.jpg",
  "couple hand casting wall hanging": "b0eb6fa22bc3442ba1080a599cc97f76~mv2.jpg", "couple hand casting": "01737d691eab461798b53a2bc22f03b2~mv2.jpg",
  "belly casting": "9b66ec0ea358470fb1a42d474f2cd205~mv2_d_5184_3456_s_4_2.jpg", "face casting": "d1579ad7cc8340af9681639d3ee1023f~mv2.jpg",
  "lip casting": "87a4ae158c854dd3b40b84b4d228f5d4~mv2_d_1500_1423_s_2.jpg", "parent with baby frame casting": "539c1391177b4e2da16fac0cef4c0516~mv2.jpg",
  "family casting (4 members)": "6b14850c25604978bbc723949a80b1f6~mv2.jpg", "baby collectible frame": "4b20f31054f241b4b7f8badf37636850~mv2.jpg",
  "clock concept casting service": "e344113b463f4e92beddec6fd49006bc~mv2.jpg", "pet casting": "03de73f3ea084824a2d2d04025c917a3~mv2.jpg",
  "casting with special props": "9bf8a3e2dbad402fa4546b3f3c4042a4~mv2.jpg", "marriage gift voucher": "a71b13507d4d49ffa05103fcc7038a09~mv2_d_2480_3508_s_4_2.jpg",
  "parent ashirwad casting": "5118ab8a8ce64a2ab548303513f7c4a0~mv2_d_2448_2152_s_2.jpg", "parent with infant casting": "148d4fa6d2cf476280bf3e5b49c6b726~mv2.jpg",
  "birthday gift voucher": "33be5d8d22574e1aa5076308a8105208~mv2_d_2480_3508_s_4_2.jpg",
};
const svcImg = (name, w = 640, h = 480) => { const f = SVC_IMG[String(name).trim().toLowerCase()]; return f ? `https://static.wixstatic.com/media/0eb19c_${f}/v1/fill/w_${w},h_${h},al_c,q_80,enc_auto/${f.replace(/~.*(\.\w+)$/, "$1").replace(/^/, "photo")}` : ""; };
const svcCard = (s) => { const im = svcImg(s.name); return `<a class="card link svc" href="#/book?service=${s.id}">${im ? `<div class="svc-img"><img loading="lazy" src="${im}" alt="${esc(s.name)}" onerror="this.parentNode.remove()"></div>` : ""}<div class="svc-body"><span class="tag">${esc(catOf(s.name))}</span>
  <h3 style="margin:10px 0 6px">${esc(s.name)}</h3><div class="price"><small>${s.is_from_price ? "from " : ""}</small>${inr(s.price_incl_gst)} <small>&middot; ${Number(s.duration_hours)} hr</small></div></div></a>`; };
const loading = () => `<div class="wrap" style="padding:60px var(--gutter)"><p class="hint">Loading&hellip;</p></div>`;
const failBox = (m) => `<div class="wrap" style="padding:60px var(--gutter)"><div class="note bad">${esc(m)}</div><p style="margin-top:16px"><a class="btn" href="#/">Back to home</a></p></div>`;
const pageHead = (t, p) => `<section class="s soft"><div class="wrap"><h1 style="font-size:clamp(2rem,5vw,3.2rem)">${esc(t)}</h1>${p ? `<p class="hint" style="font-size:1.05rem;max-width:40em;margin-top:12px">${p}</p>` : ""}</div></section>`;
const studioCard = (s) => `<div class="card"><span class="tag">${esc(s.tag)}</span><h3 style="margin:10px 0 6px;font-size:1.3rem">${esc(s.name)}</h3><p class="hint">${esc(s.addr)}</p>
  <p style="margin:0 0 4px"><a href="tel:+91${s.phone}">${s.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}</a></p><p class="hint">Mon&ndash;Sat, 10 AM&ndash;5 PM</p>
  <p><a class="btn small" href="https://wa.me/${s.wa}" target="_blank" rel="noopener">WhatsApp</a> <a class="btn small primary" href="#/book?studio=${esc(s.name)}">Book here</a></p></div>`;

// ---------- pages ----------
const pages = {};
pages.home = async () => {
  main.innerHTML = `
  <section class="hero"><div class="wrap"><div>
    <p class="kick">Since 2015</p>
    <h1>Freeze your <em>memories</em> today.</h1>
    <p class="lead">A life-size keepsake of your baby&rsquo;s tiny hands and feet, your wedding hands, your whole family. Made by hand in our studios, finished in a frame you will actually display.</p>
    <div class="cta"><a class="btn primary" href="#/book">Book a session</a><a class="btn ghost" href="#/services">See services &amp; prices</a></div>
    <div class="proof"><span><b>50,000+</b>happy customers</span><span><b>30,000+</b>baby castings</span><span><b>2+</b>locations, growing fast</span></div>
  </div>
  <form class="quick" id="quick"><h3>Check a time</h3><p class="s">Pick a studio and a service, then see open dates.</p>
    <label for="q-loc">Studio</label><select id="q-loc"></select><label for="q-svc">Service</label><select id="q-svc"></select>
    <p style="margin-top:18px"><button class="btn primary" style="width:100%">Choose a date</button></p><p class="hint" style="margin:0">Pay only a small advance to confirm.</p></form></div></section>
  <section class="s"><div class="wrap"><div class="head"><div><h2>How booking works</h2></div></div>
    <div class="steps"><div><h3>Choose service &amp; studio</h3><p class="hint">Prices are final and include 5% GST and your frame.</p></div>
    <div><h3>Pick a date and time</h3><p class="hint">See live availability. Your slot is held while you pay.</p></div>
    <div><h3>Pay a small advance</h3><p class="hint">Secure payment by UPI, card or netbanking through Razorpay.</p></div>
    <div><h3>Get your confirmation</h3><p class="hint">Email with a link to view, reschedule or cancel up to 24 hours before.</p></div></div></div></section>
  <section class="s soft"><div class="wrap"><div class="head"><div><h2>What we cast</h2><p>Every session includes impressions, casting, printing and framing.</p></div><a class="btn ghost small" href="#/services">All services</a></div>
    <div class="grid" id="cats"></div></div></section>
  <section class="s deep"><div class="wrap"><div class="head"><div><h2>Made carefully, made to last</h2><p>Baby skin safe, non-toxic and hand-crafted. Founded in 2015 by Keerthi Nagacharan.</p></div></div>
    <div class="stats"><div><b>100%</b>baby skin safe</div><div><b>Non-toxic</b>material</div><div><b>1 Lakh+</b>lifecasting done</div><div><b>3 weeks</b>typical delivery</div></div></div></section>
  <section class="s"><div class="wrap"><div class="head"><div><h2>Visit a studio</h2></div></div><div class="grid" id="studios"></div>
    <p class="hint" style="margin-top:22px">As seen in: Times of India (2017), Dinamalar (2018), The New Indian Express (2018), Manava Kathir (2019).</p></div></section>`;
  $("#studios").innerHTML = STUDIOS.map(studioCard).join("");
  let c; try { c = await catalog(); } catch { $("#quick").innerHTML = `<div class="note bad">Online booking is unavailable right now. Please call 875 444 9459.</div>`; return; }
  $("#q-loc").innerHTML = c.locations.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("");
  $("#q-svc").innerHTML = c.services.map((s) => `<option value="${s.id}">${esc(s.name)} - ${s.is_from_price ? "from " : ""}${inr(s.price_incl_gst)}</option>`).join("");
  $("#quick").onsubmit = (e) => { e.preventDefault(); location.hash = `#/book?service=${$("#q-svc").value}&studio=${encodeURIComponent(c.locations.find((l) => l.id == $("#q-loc").value).name)}`; };
  $("#cats").innerHTML = CATS.map(([n, , d]) => { const list = c.services.filter((s) => catOf(s.name) === n); if (!list.length) return "";
    const low = Math.min(...list.map((s) => +s.price_incl_gst)); return `<a class="card link" href="#/services"><h3 style="font-size:1.25rem">${esc(n)}</h3><p class="hint" style="margin:6px 0 12px">${esc(d)}</p><div class="price"><small>from </small>${inr(low)}</div></a>`; }).join("");
};
pages.services = async () => {
  main.innerHTML = pageHead("Services & prices", "All prices include 5% GST and the frame. Final price depends on the options you choose at the studio.") + `<section class="s"><div class="wrap" id="svc">Loading&hellip;</div></section>`;
  const c = await catalog();
  $("#svc").innerHTML = [...CATS.map((x) => x[0]), "More"].map((n) => { const list = c.services.filter((s) => catOf(s.name) === n); return list.length ? `<h2 style="margin:34px 0 16px;font-size:1.6rem">${esc(n)}</h2><div class="grid">${list.map(svcCard).join("")}</div>` : ""; }).join("") +
    `<h2 style="margin:40px 0 16px;font-size:1.6rem">Add-ons</h2><div class="grid">${c.addons.map((a) => `<div class="card"><h3>${esc(a.name)}</h3><div class="price">${inr(a.price_incl_gst)}</div></div>`).join("")}</div>`;
};
pages.gallery = async () => {
  main.innerHTML = pageHead("Gallery", "A few of the keepsakes we have made for families across Tamil Nadu.") + `<section class="s"><div class="wrap" id="g"></div></section>`;
  let list = []; try { list = (await (await fetch("gallery.json", { cache: "no-cache" })).json()).photos || []; } catch {}
  $("#g").innerHTML = list.length ? `<div class="gal">${list.map((p) => `<img loading="lazy" src="${esc(p.src)}" alt="${esc(p.alt || "Lifeimpressions casting")}">`).join("")}</div>` :
    `<div class="note">Photos are coming soon. See our latest work on Instagram and Facebook.</div><p style="margin-top:14px">${socials("lg")}</p>`;
};
pages.locations = () => { main.innerHTML = pageHead("Our studios", "Open Monday to Saturday, 10 AM to 5 PM. Please book a slot before you visit.") + `<section class="s"><div class="wrap"><div class="grid">${STUDIOS.map(studioCard).join("")}</div></div></section>`; };
const IMG = (id, ext, w = 560) => `https://static.wixstatic.com/media/0eb19c_${id}~mv2.${ext}/v1/fill/w_${w},h_${w},al_c,q_80/${id}.${ext}`;
const SHOP = [
  { name: "Baby Casting Kit", cat: "Baby Casting Kit", price: "From \u20B92,800", opt: "Single or Double", img: IMG("cf9664b6b8a84cde94a98869e99332db", "jpg"), alt: IMG("ea0b16356db542e3aa669c1d2a0ebd93", "png"), note: "Make your own baby hand and foot casting at home." },
  { name: "Couple Casting Kit", cat: "Couple Casting Kit", price: "\u20B92,500", img: IMG("9a20000d9e4d4e8ca57639b10aa25c6d", "jpg"), alt: IMG("21b80713b2a049a4b6305a440c80511a", "jpg"), note: "Everything you need for a couple hand casting." },
  { name: "Depth Wooden Box for Frame", cat: "Raw Materials", price: "From \u20B9450", opt: "Single or Double", img: IMG("7958e27cdfb74a659cbdb5b5c9bc2200", "jpg"), tag: "New", note: "A deep wooden box frame to display your casting." },
  { name: "Impression Material (1 Kg Bag)", cat: "Raw Materials", price: "\u20B91,250", img: IMG("8a8093a1b3d04e39acea3c5f1f88fdbd", "jpg"), alt: IMG("bf45d62b2fa2449791783278462f7819", "png"), tag: "New", note: "Skin-safe impression material. One 1 kg bag is enough for a single or a double baby casting." },
  { name: "Casting Powder (1 Kg Bag)", cat: "Raw Materials", price: "\u20B9125", unit: "\u20B98.75 per 70 g", img: IMG("2ed1b9f4029c44b0a648c24215a8f7b1", "jpg"), alt: IMG("d5cd60b4bbbb4af1be1e1d26286afeb6", "jpg"), note: "Casting powder, 1 kg pack." },
];
pages.shop = async () => {
  const wa = (n) => `https://wa.me/91${C.PHONE_1}?text=${encodeURIComponent("Hi Lifeimpressions, I would like to order: " + n)}`;
  main.innerHTML = pageHead("Shop", "Casting kits and raw materials. Prices include taxes. Order on WhatsApp and we will confirm stock, delivery and payment with you.") +
    `<section class="s"><div class="wrap"><div class="chips" id="shopf" style="margin-bottom:22px">${["All", "Baby Casting Kit", "Couple Casting Kit", "Raw Materials"].map((c, i) => `<button class="chip${i ? "" : " on"}" data-c="${c}">${c}</button>`).join("")}</div>
    <div class="grid" id="sh"></div></div></section>
    <section class="s soft"><div class="wrap"><div class="head"><div><h2>Gifts &amp; keepsakes you can book</h2><p>Gift vouchers, collectible frames and the clock concept are booked as sessions.</p></div></div><div class="grid" id="gf"></div></div></section>`;
  const draw = (cat) => { $("#sh").innerHTML = SHOP.filter((p) => cat === "All" || p.cat === cat).map((p) => `<div class="card" style="padding:0;overflow:hidden"><div style="position:relative;aspect-ratio:1;background:var(--soft)"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">${p.tag ? `<span class="tag" style="position:absolute;top:10px;left:10px;background:#fff">${p.tag}</span>` : ""}</div>
    <div style="padding:16px"><h3>${esc(p.name)}</h3><p class="hint" style="margin:6px 0 10px">${esc(p.note)}</p><div class="price">${p.price}${p.unit ? ` <small>${p.unit}</small>` : ""}</div>${p.opt ? `<p class="hint" style="margin:4px 0 0">Options: ${p.opt}</p>` : ""}
    <p style="margin:14px 0 0"><a class="btn small primary" href="${wa(p.name)}" target="_blank" rel="noopener">Order on WhatsApp</a></p></div></div>`).join(""); };
  draw("All"); $$("#shopf .chip").forEach((b) => b.onclick = () => { $$("#shopf .chip").forEach((x) => x.classList.toggle("on", x === b)); draw(b.dataset.c); });
  try { const c = await catalog(); $("#gf").innerHTML = c.services.filter((s) => /collectible|clock|voucher/i.test(s.name)).map(svcCard).join(""); } catch { $("#gf").innerHTML = ""; }
};
pages.franchise = () => {
  main.innerHTML = pageHead("Own a Lifeimpressions studio", "A home-grown franchise for women entrepreneurs, with training and first-year support.") + `<section class="s"><div class="wrap book two-col">
  <div class="prose"><h2 style="margin-top:0">Why join us</h2><ul><li>Training in casting, finishing and customer handling</li><li>Support through your first year</li><li>A room of about 10 x 10 ft is enough to start</li><li>One brand, one booking system, shared marketing</li></ul><p class="hint">Tell us about yourself and the head office will call you.</p></div>
  <form id="f" class="panel"><h3>Franchise enquiry</h3>${enqFields(true)}<p><button class="btn primary">Send enquiry</button></p><div id="fm"></div></form></div></section>`;
  bindEnq($("#f"), "franchise");
};
pages.contact = () => {
  main.innerHTML = pageHead("Contact us", "We usually reply within a few hours, Monday to Saturday.") + `<section class="s"><div class="wrap book two-col">
  <div class="prose"><h2 style="margin-top:0">Reach us</h2><p>Call or WhatsApp:<br><a href="tel:+91${C.PHONE_1}">875 444 9459</a></p><p>Email:<br><a href="mailto:${C.EMAIL}">${C.EMAIL}</a></p><p>Follow us:<br>${socials("lg")}</p><p>For a session, <a href="#/book">book online</a> and see live availability.</p></div>
  <form id="f" class="panel"><h3>Send a message</h3>${enqFields(false)}<p><button class="btn primary">Send</button></p><div id="fm"></div></form></div></section>`;
  bindEnq($("#f"), "contact");
};
const enqFields = (fr) => `<label for="e-n">Your name</label><input id="e-n" required autocomplete="name"><label for="e-p">Mobile number</label><input id="e-p" inputmode="tel" required autocomplete="tel" placeholder="10-digit number">
  <label for="e-e">Email (optional)</label><input id="e-e" type="email" autocomplete="email">${fr ? `<label for="e-c">City you want to open in</label><input id="e-c">` : ""}
  <label for="e-m">${fr ? "Tell us a little about you" : "Message"}</label><textarea id="e-m" required></textarea><div class="hp" aria-hidden="true"><label>Website<input id="e-w" tabindex="-1" autocomplete="off"></label></div>`;
function bindEnq(f, kind) {
  f.onsubmit = async (e) => { e.preventDefault(); const b = $("button", f); b.disabled = true; $("#fm").innerHTML = "";
    try { await post("/enquiry", { kind, name: $("#e-n").value, phone: $("#e-p").value, email: $("#e-e").value, city: $("#e-c")?.value, message: $("#e-m").value, website: $("#e-w").value });
      f.innerHTML = `<div class="ok-box"><div class="tick">&#10003;</div><h3>Thank you</h3><p class="hint">We have your message and will call you soon.</p></div>`; }
    catch (err) { $("#fm").innerHTML = `<div class="note bad">${esc(err.message)}</div>`; b.disabled = false; } };
}
const FAQ = [
  ["How long does a session take?", "Between 1 and 4 hours depending on the service. The duration is shown next to each service when you book."],
  ["Is casting safe for my baby?", "Yes. We use baby skin safe, non-toxic material, and our team is trained to work gently with infants."],
  ["How much do I pay when booking?", "A small advance online (shown before you pay) confirms your slot. The balance is paid at the studio after your session."],
  ["When will I receive my frame?", "Typically within about 3 weeks of your casting date. You approve the photo and layout before we finish your frame."],
  ["Can I reschedule or cancel?", "Yes, from the link in your confirmation email, up to 24 hours before your session. Please read our cancellation and refund policy."],
  ["Do you offer doorstep service?", "Doorstep service is available when you book online. Travel is charged at \u20B930 per km, counted for the way there and back, worked out from the location you pick on the map. Toll and parking, if any, are extra at actuals. You pay this at your session."],
  ["What should I bring?", "Bring the photo you want in your frame (if your service includes one) and arrive 10 minutes early."],
  ["Which payment methods work?", "UPI, cards and netbanking, processed securely by Razorpay."],
  ["Can I change the frame after ordering?", "White-frame orders cannot be modified once placed. Please choose your frame size carefully."],
];
pages.faq = () => { main.innerHTML = pageHead("Frequently asked questions") + `<section class="s"><div class="wrap prose">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}<p style="margin-top:28px">Still unsure? <a href="#/contact">Ask us</a>.</p></div></section>`; };
const POL = {
  terms: ["Terms & conditions", `<p>By booking with Lifeimpressions you agree to these terms.</p><h2>Raw material &amp; frame selection</h2><p>Casting material and frame size are chosen with you at the studio. Please choose carefully, as white-frame orders cannot be modified once placed.</p><h2>Products are made to order</h2><p>Each piece is made specially for you from material that cannot be reused. Once impressions have been taken, the order cannot be refunded.</p><h2>Doorstep &amp; delivery</h2><p>Doorstep sessions are charged \u20B930 per km, counted up and down, from the studio to your address. Toll and parking, if any, are extra at actuals. Delivery to your address attracts an additional round-trip travel or courier charge, shown on your bill.</p><h2>Prices</h2><p>All prices include 5% GST. The advance paid online is part of your total.</p><h2>WhatsApp updates</h2><p>You agree to receive order updates on the WhatsApp number you provide.</p>`],
  cancellation: ["Cancellation & refund", `<p>You can reschedule once, or cancel, from the link in your confirmation email up to 24 hours before your session.</p><h2>Advance payment</h2><p>Because every piece is prepared and made to order, the advance is not automatically refunded on cancellation. Please contact us if you believe an exception applies.</p><h2>After impressions are taken</h2><p>Products are expensive and non-reusable. No refund is possible once impressions have been taken.</p><h2>Failed or duplicate payments</h2><p>If money is debited but no booking is confirmed, it is returned to your source account by Razorpay or matched to your booking by our team. Write to ${C.EMAIL} with your payment reference.</p>`],
  shipping: ["Shipping & delivery", `<p>Your finished piece is usually ready about 3 weeks after your casting date. We message you on WhatsApp when it is ready.</p><h2>Collection</h2><p>Collect from the studio where you booked.</p><h2>Delivery</h2><p>Delivery to your address is available on request. A round-trip travel or courier charge applies and is added to your bill.</p>`],
  privacy: ["Privacy policy", `<p>We collect your name, mobile number, email and address only to take and deliver your booking and to send order updates.</p><h2>How we use it</h2><p>To confirm your booking, send emails and WhatsApp updates, and deliver your order. We do not sell your information.</p><h2>Payments</h2><p>Payments are processed by Razorpay. We never see or store your card or UPI details.</p><h2>Your choices</h2><p>To see, correct or delete your information, write to ${C.EMAIL}.</p>`],
};
pages.policy = (k) => { const p = POL[k] || POL.terms; main.innerHTML = pageHead(p[0]) + `<section class="s"><div class="wrap prose">${p[1]}<p class="hint">Last reviewed October 2026.</p></div></section>`; };

// ---------- date/time picker (used by booking and reschedule) ----------
function picker(box, st, onPick) {
  const today = istToday();
  async function load() {
    const first = st.month + "-01", start = first < today ? today : first;
    const [y, m] = st.month.split("-").map(Number), last = `${st.month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
    box.innerHTML = `<p class="hint">Loading availability&hellip;</p>`;
    try { const j = await api(`/availability?location=${st.location_id}&service=${st.service_id}&from=${start}&to=${last}${st.token ? "&token=" + encodeURIComponent(st.token) : ""}`); st.days = { ...(st.days || {}), ...j.days }; draw(); }
    catch (e) { box.innerHTML = `<div class="note bad">${esc(e.message)}</div>`; }
  }
  function draw() {
    const [y, m] = st.month.split("-").map(Number), dim = new Date(Date.UTC(y, m, 0)).getUTCDate(), off = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const prevOk = st.month > today.slice(0, 7);
    let cells = "".padEnd(0); for (let i = 0; i < off; i++) cells += "<span></span>";
    for (let d = 1; d <= dim; d++) { const iso = `${st.month}-${pad(d)}`, n = (st.days[iso] || []).length;
      cells += `<button type="button" class="day${n ? " has" : ""}${st.date === iso ? " on" : ""}" data-d="${iso}" ${n ? "" : "disabled"} aria-label="${d} ${MONTHS[m - 1]}${n ? "" : ", unavailable"}">${d}</button>`; }
    const slots = st.date ? st.days[st.date] || [] : [];
    box.innerHTML = `<div class="cal"><div class="bar"><button type="button" class="btn ghost small" id="pm" ${prevOk ? "" : "disabled"} aria-label="Previous month">&larr;</button><b>${MONTHS[m - 1]} ${y}</b><button type="button" class="btn ghost small" id="nm" aria-label="Next month">&rarr;</button></div>
      <div class="dow"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="days">${cells}</div></div>
      ${st.date ? `<h3 style="margin:22px 0 10px">Times on ${st.date.split("-").reverse().join("/")}</h3><div class="chips">${slots.map((t) => `<button type="button" class="chip${st.time === t ? " on" : ""}" data-t="${t}">${hm12(t)}</button>`).join("") || "<span class='hint'>No times left on this day.</span>"}</div>` : `<p class="hint" style="margin-top:16px">Dates with a dot have open times.</p>`}`;
    $("#pm", box).onclick = () => { const d = new Date(Date.UTC(y, m - 2, 1)); st.month = d.toISOString().slice(0, 7); load(); };
    $("#nm", box).onclick = () => { const d = new Date(Date.UTC(y, m, 1)); st.month = d.toISOString().slice(0, 7); load(); };
    $$(".day", box).forEach((b) => b.onclick = () => { st.date = b.dataset.d; st.time = ""; draw(); onPick(); });
    $$(".chip", box).forEach((b) => b.onclick = () => { st.time = b.dataset.t; draw(); onPick(); });
  }
  if (!st.month) st.month = today.slice(0, 7); st.days = st.days || {}; load();
}

// ---------- booking wizard ----------
const B = { step: 1, hold: null, consent: {}, customer: {}, addon_ids: [], payFull: false, doorstep: false, quote: null, geo: null, door: "", area: null, travelInBill: false };
const CONSENTS = [
  ["terms", "I have read and accept the <a href=\"#/policies/terms\" target=\"_blank\">Terms & conditions</a>."],
  ["raw_material", "I understand the raw material and frame selection policy: choices are made with me at the studio."],
  ["white_frame", "I understand white-frame orders cannot be modified once placed."],
  ["no_refund", "I understand products are made to order and non-reusable, with no refund once impressions are taken. <a href=\"#/policies/cancellation\" target=\"_blank\">Cancellation policy</a>."],
  ["doorstep", "I understand doorstep and delivery services attract an extra travel charge (\u20B930 per km, up and down, plus toll and parking if any)."],
  ["whatsapp", "I agree to receive updates about my order on WhatsApp."],
];
const price = (c) => { const s = c.services.find((x) => x.id == B.service_id); if (!s) return null; const add = c.addons.filter((a) => B.addon_ids.includes(a.id)).reduce((t, a) => t + +a.price_incl_gst, 0);
  const total = +s.price_incl_gst + add; const raw = Math.ceil(total * c.advance_percent / 100 / 100) * 100, min = Math.min(total, Math.max(c.advance_minimum, raw));
  const trav = B.doorstep && B.travelInBill && B.quote && B.quote.loc == B.location_id && B.quote.charge != null ? B.quote.charge : 0, bill = total + trav;   // travel is added to the bill without GST
  return { s, total, min, trav, bill, advance: B.payFull ? bill : min }; };
function quoteHtml(c) {
  const q = B.quote; if (!q) return `<p class="hint">Pick your location and we will show the travel charge here.</p>`;
  if (q.manual) return `<div class="note">We could not work out the distance automatically. Our team will confirm the travel charge (${inr(c.travel_rate)} per km, up and down) before your session.</div>`;
  const box = `<div class="check" style="margin-top:10px"><input type="checkbox" id="tib" ${B.travelInBill ? "checked" : ""}><label for="tib">Include this travel charge in my final bill (no GST added on travel)</label></div>`;
  return `<div class="note ok">About <b>${q.km} km</b> from our ${esc((c.locations.find((l) => l.id == B.location_id) || {}).name || "")} studio. ${inr(q.rate)} per km &times; ${q.multiplier} (up and down) = <b>about ${inr(q.charge)}</b>. Toll and parking, if any, are extra at actuals. ${B.travelInBill ? "It is added to your final bill." : "You pay this at your session."}</div>${box}`;
}
const geoKey = () => (B.geo ? B.geo.lat + "," + B.geo.lon : "");
async function getQuote(c, addr) {
  const g = B.geo ? `&lat=${B.geo.lat}&lon=${B.geo.lon}` : "";
  const j = await api(`/travel-quote?location=${B.location_id}&address=${encodeURIComponent(addr)}${g}`); B.quote = { ...j, address: addr, geo: geoKey(), loc: B.location_id }; return B.quote;
}
const quoteFresh = (addr) => B.quote && B.quote.address === addr && B.quote.geo === geoKey() && B.quote.loc == B.location_id;
// ---- map + place search for doorstep addresses (OpenStreetMap; no API key) ----
const NOM = "https://nominatim.openstreetmap.org";
const CITY_CENTRE = { Chennai: [13.0827, 80.2707], Salem: [11.6643, 78.146], Tirunelveli: [8.7139, 77.7567] };
let MAP = null, PIN = null, leafletP = null;
function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; js.onload = () => (window.L ? res(window.L) : rej(new Error("map"))); js.onerror = () => { leafletP = null; rej(new Error("map")); }; document.head.appendChild(js);
  });
  return leafletP;
}
function trimPlace(n) { return String(n || "").replace(/,\s*India\s*$/i, ""); }
async function reverseName(lat, lon) {
  try { const r = await fetch(`${NOM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lon}`); if (!r.ok) return ""; const j = await r.json(); return trimPlace(j.display_name); } catch { return ""; }
}
function initPicker(c, refresh) {
  const area = $("#ad"), box = $("#gs"), list = $("#gl"), tq = $("#tq");
  const bindTib = () => { const t = $("#tib"); if (t) t.onchange = () => { B.travelInBill = t.checked; tq.innerHTML = quoteHtml(c); bindTib(); refresh(); }; };
  const showQuote = async () => {
    const addr = [$("#door").value.trim(), area.value.trim()].filter(Boolean).join(", ");
    if (!B.geo && area.value.trim().length < 5) return;
    tq.innerHTML = '<p class="hint">Checking distance&hellip;</p>';
    try { await getQuote(c, addr.length >= 10 ? addr : (area.value.trim() + ", India")); } catch (e) { tq.innerHTML = `<div class="note bad">${esc(e.message)}</div>`; return; }
    tq.innerHTML = quoteHtml(c); bindTib(); refresh();
  };
  let ready = null;
  const place = async (lat, lon, name, move) => {
    B.geo = { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 }; B.quote = null;
    if (MAP && PIN) { PIN.setLatLng([lat, lon]); if (move) MAP.setView([lat, lon], 17); }
    area.value = name || "Finding address…"; if (!name) { const n = await reverseName(lat, lon); area.value = n; } B.area = area.value;
    showQuote();
  };
  loadLeaflet().then((L) => {
    if (MAP) { MAP.remove(); MAP = null; PIN = null; }
    const loc = (c.locations.find((l) => l.id == B.location_id) || {}).name, start = B.geo ? [B.geo.lat, B.geo.lon] : (CITY_CENTRE[loc] || CITY_CENTRE.Chennai);
    MAP = L.map("map", { scrollWheelZoom: false }).setView(start, B.geo ? 17 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(MAP);
    PIN = L.marker(start, { draggable: true }); if (B.geo) PIN.addTo(MAP);
    PIN.on("dragend", () => { const p = PIN.getLatLng(); place(p.lat, p.lng, "", false); });
    MAP.on("click", (e) => { if (!MAP.hasLayer(PIN)) PIN.addTo(MAP); place(e.latlng.lat, e.latlng.lng, "", false); });
    ready = L;
  }).catch(() => { $("#map").style.display = "none"; $("#maphint").textContent = "The map could not load. Search above or type your area below."; });
  const put = async (lat, lon, name) => { if (ready && !MAP.hasLayer(PIN)) PIN.addTo(MAP); await place(lat, lon, name, true); };
  let timer = null, ctl = null;
  box.oninput = () => { clearTimeout(timer); const q = box.value.trim(); if (q.length < 3) { list.hidden = true; return; }
    timer = setTimeout(async () => { if (ctl) ctl.abort(); ctl = new AbortController();
      try { const r = await fetch(`${NOM}/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`, { signal: ctl.signal }); const j = await r.json();
        list.innerHTML = j.length ? j.map((p, i) => `<li data-i="${i}">${esc(trimPlace(p.display_name))}</li>`).join("") : '<li class="none">No match. Try a nearby landmark, or tap the map.</li>'; list.hidden = false;
        list.onclick = (ev) => { const li = ev.target.closest("li[data-i]"); if (!li) return; const p = j[+li.dataset.i]; list.hidden = true; box.value = trimPlace(p.display_name); put(+p.lat, +p.lon, trimPlace(p.display_name)); };
      } catch (e) { if (e.name !== "AbortError") { list.innerHTML = '<li class="none">Search is unavailable. Tap the map or type your area below.</li>'; list.hidden = false; } } }, 700); };
  $("#gps").onclick = () => { if (!navigator.geolocation) { $("#maphint").textContent = "Your browser cannot share its location. Search or tap the map instead."; return; }
    navigator.geolocation.getCurrentPosition((p) => put(p.coords.latitude, p.coords.longitude, ""), () => { $("#maphint").textContent = "We could not get your location. Search or tap the map instead."; }, { enableHighAccuracy: true, timeout: 10000 }); };
  area.onchange = () => { B.area = area.value.trim(); B.quote = null; showQuote(); };
  $("#door").onchange = () => { B.door = $("#door").value.trim(); };
  bindTib();
  if (B.geo && (!B.quote || B.quote.loc != B.location_id)) showQuote();
}
function summary(c) {
  const p = price(c), loc = c.locations.find((l) => l.id == B.location_id);
  return `<aside class="summary" aria-label="Booking summary"><h3>Your booking</h3><dl><dt>Studio</dt><dd>${esc(loc?.name || "-")}</dd><dt>Service</dt><dd>${esc(p?.s.name || "-")}</dd>
    <dt>Date</dt><dd>${B.date && B.time ? `${B.date.split("-").reverse().join("/")}, ${hm12(B.time)}` : "-"}</dd></dl>${p ? `<hr><dl><dt>Total (incl. GST)</dt><dd>${inr(p.total)}</dd>${p.trav ? `<dt>Travel (no GST)</dt><dd>${inr(p.trav)}</dd><dt>Final bill</dt><dd>${inr(p.bill)}</dd>` : ""}</dl>${p.s.is_from_price ? `<p class="hint" style="color:#C9BFB5;margin:6px 0 0">Starting price. Final price depends on the options chosen.</p>` : ""}<hr>
    <div class="due"><span>Pay now</span><span>${inr(p.advance)}</span></div><p style="color:#C9BFB5;font-size:.88rem;margin:8px 0 0">Balance ${inr(p.bill - p.advance)} at the studio.</p>${B.doorstep ? (p.trav ? `<p style="color:#C9BFB5;font-size:.88rem;margin:8px 0 0">Travel is included in your final bill, with no GST on it. Toll and parking, if any, are extra at actuals.</p>` : `<hr><dl><dt>Doorstep travel</dt><dd>${B.quote && B.quote.charge != null ? "about " + inr(B.quote.charge) : "to be confirmed"}</dd></dl><p style="color:#C9BFB5;font-size:.88rem;margin:6px 0 0">Paid at your session, not now. Toll and parking, if any, are extra at actuals.</p>`) : ""}` : ""}</aside>`;
}
pages.book = async (q) => {
  main.innerHTML = `<div class="wrap">${loading()}</div>`; let c; try { c = await catalog(); } catch (e) { main.innerHTML = failBox(e.message); return; }
  if (q.get("service")) { B.service_id = +q.get("service"); B.step = Math.max(1, B.step === 1 ? 1 : B.step); }
  if (q.get("studio")) { const l = c.locations.find((x) => x.name === q.get("studio")); if (l) B.location_id = l.id; }
  if (B.service_id && !c.services.some((s) => s.id === B.service_id)) B.service_id = null;
  render(c);
};
function render(c) {
  const steps = ["Service & studio", "Date & time", "Your details", "Review & pay"];
  main.innerHTML = `<div class="wrap"><div class="book"><div><h1 style="font-size:clamp(1.8rem,4vw,2.6rem);margin:26px 0 16px">Book a session</h1>
    <ol class="prog" style="list-style:none;padding:0;margin:0 0 22px">${steps.map((s, i) => `<li><span class="${B.step === i + 1 ? "on" : B.step > i + 1 ? "done" : ""}">${i + 1}. ${s}</span></li>`).join("")}</ol>
    <div class="panel" id="stepbox"></div></div><div id="sum">${summary(c)}</div></div></div>`;
  const box = $("#stepbox"), refresh = () => { $("#sum").innerHTML = summary(c); }, go = (n) => { B.step = n; render(c); window.scrollTo({ top: 0, behavior: "smooth" }); };
  if (B.step === 1) {
    box.innerHTML = `<h2 style="font-size:1.5rem;margin-bottom:6px">Where and what?</h2><label>Studio</label><div class="chips" id="locs">${c.locations.map((l) => `<button type="button" class="chip${B.location_id == l.id ? " on" : ""}" data-l="${l.id}">${esc(l.name)}</button>`).join("")}</div>
      <label style="margin-top:22px">Service</label><div class="pick" id="svcs">${c.services.map((s) => `<button type="button" class="opt${B.service_id == s.id ? " on" : ""}" data-s="${s.id}">${svcImg(s.name, 120, 120) ? `<img class="opt-img" loading="lazy" src="${svcImg(s.name, 120, 120)}" alt="" onerror="this.remove()">` : ""}<span style="flex:1"><b>${esc(s.name)}</b><small>${Number(s.duration_hours)} hr &middot; ${esc(catOf(s.name))}</small></span><span class="price">${s.is_from_price ? "<small>from </small>" : ""}${inr(s.price_incl_gst)}</span></button>`).join("")}</div>
      <p style="margin-top:22px"><button class="btn primary" id="next" ${B.location_id && B.service_id ? "" : "disabled"}>Choose date &amp; time</button></p>`;
    const chk = () => { $("#next").disabled = !(B.location_id && B.service_id); refresh(); };
    $$("#locs .chip").forEach((b) => b.onclick = () => { B.location_id = +b.dataset.l; B.quote = null; B.date = B.time = ""; B.pk = null; $$("#locs .chip").forEach((x) => x.classList.toggle("on", x === b)); chk(); });
    $$("#svcs .opt").forEach((b) => b.onclick = () => { B.service_id = +b.dataset.s; B.date = B.time = ""; B.pk = null; $$("#svcs .opt").forEach((x) => x.classList.toggle("on", x === b)); chk(); });
    $("#next").onclick = () => go(2);
  }
  if (B.step === 2) {
    box.innerHTML = `<h2 style="font-size:1.5rem;margin-bottom:14px">Pick a date and time</h2><div id="pk"></div><p style="margin-top:24px"><button class="btn ghost" id="back">Back</button> <button class="btn primary" id="next" ${B.date && B.time ? "" : "disabled"}>Continue</button></p>`;
    B.pk = B.pk || { location_id: B.location_id, service_id: B.service_id, date: B.date, time: B.time };
    picker($("#pk"), B.pk, () => { B.date = B.pk.date; B.time = B.pk.time; $("#next").disabled = !(B.date && B.time); refresh(); });
    $("#back").onclick = () => go(1); $("#next").onclick = () => go(3);
  }
  if (B.step === 3) {
    const needsFrame = !/voucher/i.test(c.services.find((s) => s.id == B.service_id).name), cu = B.customer;
    box.innerHTML = `<h2 style="font-size:1.5rem;margin-bottom:6px">Your details</h2><form id="df" novalidate>
      ${needsFrame ? `<label>Frame size</label><div class="chips" id="fr">${c.frames.map((f) => `<button type="button" class="chip${B.frame_size_id == f.id ? " on" : ""}" data-f="${f.id}">${esc(f.name)}</button>`).join("")}</div><div class="err" id="er-frame"></div><p class="hint">Frame price is included in the service.</p>` : ""}
      <label>Add-ons (optional)</label>${c.addons.map((a) => `<div class="check"><input type="checkbox" id="a${a.id}" ${B.addon_ids.includes(a.id) ? "checked" : ""}><label for="a${a.id}">${esc(a.name)} &middot; ${inr(a.price_incl_gst)}</label></div>`).join("")}
      <label for="n">Full name</label><input id="n" autocomplete="name" value="${esc(cu.name)}"><div class="err" id="er-name"></div>
      <label for="p">WhatsApp / mobile number</label><input id="p" inputmode="tel" autocomplete="tel" placeholder="10-digit number" value="${esc(cu.phone)}"><div class="err" id="er-phone"></div>
      <label for="e">Email (for your confirmation)</label><input id="e" type="email" autocomplete="email" value="${esc(cu.email)}"><div class="err" id="er-email"></div>
      <label>Where should we do the session?</label><div class="pick" id="where"><button type="button" class="opt${B.doorstep ? "" : " on"}" data-w="0"><span><b>At the studio</b><small>No travel charge</small></span></button><button type="button" class="opt${B.doorstep ? " on" : ""}" data-w="1"><span><b>Doorstep service</b><small>We come to you. ${inr(c.travel_rate)} per km, counted up and down. Toll and parking extra, if any.</small></span></button></div>
      ${B.doorstep ? `<label for="gs">Find your location</label><div class="gwrap"><input id="gs" placeholder="Type your area, street or landmark" autocomplete="off"><ul class="glist" id="gl" hidden></ul></div>
        <p style="margin:8px 0 0"><button type="button" class="btn ghost small" id="gps">Use my current location</button></p>
        <div id="map" class="map" aria-label="Map to pick your location"></div><p class="hint" id="maphint">Search above, tap the map, or drag the pin to your exact spot.</p>
        <label for="door">Door / flat number, building, landmark</label><input id="door" autocomplete="off" placeholder="e.g. Flat 4B, Sai Apartments, near the temple" value="${esc(B.door)}"><div class="err" id="er-door"></div>
        <label for="ad">Area (filled from the map, you can edit it)</label><textarea id="ad" autocomplete="off">${esc(B.area == null ? "" : B.area)}</textarea><div class="err" id="er-address"></div>
        <div id="tq" style="margin-top:10px">${quoteHtml(c)}</div>`
      : `<label for="ad">Address (optional)</label><textarea id="ad" autocomplete="street-address">${esc(cu.address)}</textarea><div class="err" id="er-address"></div>`}
      <label for="nt">Anything we should know? (optional)</label><textarea id="nt">${esc(B.notes)}</textarea>
      <p style="margin-top:22px"><button type="button" class="btn ghost" id="back">Back</button> <button class="btn primary">Continue</button></p></form>`;
    $$("#fr .chip").forEach((b) => b.onclick = () => { B.frame_size_id = +b.dataset.f; $$("#fr .chip").forEach((x) => x.classList.toggle("on", x === b)); });
    c.addons.forEach((a) => $("#a" + a.id).onchange = (e) => { B.addon_ids = e.target.checked ? [...B.addon_ids, a.id] : B.addon_ids.filter((x) => x !== a.id); refresh(); });
    const grab = () => {
      let address = $("#ad").value.trim();
      if (B.doorstep) { B.door = $("#door").value.trim(); B.area = address; address = [B.door, B.area].filter(Boolean).join(", "); }
      B.customer = { name: $("#n").value.trim(), phone: $("#p").value.trim(), email: $("#e").value.trim(), address }; B.notes = $("#nt").value; };
    $$("#where .opt").forEach((b) => b.onclick = () => { grab(); const was = B.doorstep; B.doorstep = b.dataset.w === "1";
      if (B.doorstep && !was && B.area == null) B.area = B.customer.address; if (!B.doorstep) { B.quote = null; B.geo = null; } render(c); });
    if (B.doorstep) initPicker(c, refresh);
    $("#back").onclick = () => go(2);
    $("#df").onsubmit = async (ev) => { ev.preventDefault(); grab();
      const digits = B.customer.phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); const bad = {};
      if (B.customer.name.length < 2) bad.name = "Please enter your name"; if (!/^[6-9]\d{9}$/.test(digits)) bad.phone = "Enter a valid 10-digit mobile number";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(B.customer.email)) bad.email = "Enter a valid email address"; if (needsFrame && !B.frame_size_id) bad.frame = "Choose a frame size";
      if (B.doorstep) { if (!B.door) bad.door = "Enter your door or flat number"; if ((B.area || "").length < 5 || B.customer.address.length < 10) bad.address = "Pick your location on the map or type your area"; }
      ["name", "phone", "email", "frame", "address", "door"].forEach((k) => { const el = $("#er-" + k); if (el) el.textContent = bad[k] || ""; });
      if (Object.keys(bad).length) { $("#" + ({ name: "n", phone: "p", email: "e", frame: "fr", address: "ad", door: "door" })[Object.keys(bad)[0]])?.scrollIntoView({ block: "center" }); return; }
      if (B.doorstep && !quoteFresh(B.customer.address)) { try { await getQuote(c, B.customer.address); } catch (e) { $("#er-address").textContent = e.message; return; } }
      go(4); };
  }
  if (B.step === 4) {
    const p = price(c);
    box.innerHTML = `<h2 style="font-size:1.5rem;margin-bottom:6px">Review &amp; pay</h2><p class="hint">Please accept each policy to continue.</p>
      ${CONSENTS.map(([k, t]) => `<div class="check"><input type="checkbox" id="c-${k}" ${B.consent[k] ? "checked" : ""}><label for="c-${k}">${t}</label></div>`).join("")}
      <h3 style="margin:22px 0 8px">How much to pay now?</h3><div class="pick" id="amt"><button type="button" class="opt${B.payFull ? "" : " on"}" data-f="0"><span><b>Pay ${inr(p.min)} now</b><small>Balance ${inr(p.bill - p.min)} at the studio</small></span></button>${p.bill > p.min ? `<button type="button" class="opt${B.payFull ? " on" : ""}" data-f="1"><span><b>Pay the full ${inr(p.bill)} now</b><small>${B.doorstep ? (p.trav ? "Nothing to pay at the studio, apart from toll and parking if any" : "Only the doorstep travel charge is paid at your session") : "Nothing to pay at the studio"}</small></span></button>` : ""}</div>
      <div id="pe"></div><p style="margin-top:22px"><button class="btn ghost" id="back">Back</button> <button class="btn primary" id="pay" ${CONSENTS.every(([k]) => B.consent[k]) ? "" : "disabled"}>Pay ${inr(p.advance)} &amp; confirm</button></p>
      <p class="hint">Secure payment by Razorpay. Your slot is held for a few minutes while you pay.</p>`;
    CONSENTS.forEach(([k]) => $("#c-" + k).onchange = (e) => { B.consent[k] = e.target.checked; $("#pay").disabled = !CONSENTS.every(([x]) => B.consent[x]); });
    $$("#amt .opt").forEach((b) => b.onclick = () => { B.payFull = b.dataset.f === "1"; render(c); });
    $("#back").onclick = () => go(3); $("#pay").onclick = () => pay(c, price(c));
  }
}
async function pay(c, p) {
  const btn = $("#pay"), pe = $("#pe"); btn.disabled = true; pe.innerHTML = ""; const label = btn.innerHTML; btn.textContent = "Holding your slot…";
  try {
    if (!B.hold || B.hold.sig !== JSON.stringify([B.location_id, B.service_id, B.date, B.time, B.addon_ids, B.frame_size_id, B.customer, B.payFull, B.doorstep, geoKey(), B.travelInBill])) {
      const h = await post("/hold", { location_id: B.location_id, service_id: B.service_id, frame_size_id: B.frame_size_id || null, addon_ids: B.addon_ids, date: B.date, time: B.time, customer: B.customer, notes: B.notes, consent: B.consent, pay_full: B.payFull, doorstep: B.doorstep, travel_in_bill: B.doorstep && B.travelInBill, geo: B.doorstep ? B.geo : null, previous_token: B.hold ? B.hold.token : undefined });
      B.hold = { ...h, sig: JSON.stringify([B.location_id, B.service_id, B.date, B.time, B.addon_ids, B.frame_size_id, B.customer, B.payFull, B.doorstep, geoKey(), B.travelInBill]) };
    }
    await openCheckout(B.hold); 
  } catch (e) {
    pe.innerHTML = `<div class="note bad">${esc(e.message)}</div>`; if (e.data?.code === "slot_taken" || e.data?.code === "closed") { B.date = B.time = ""; B.pk = null; B.hold = null; pe.innerHTML += `<p><button class="btn primary" id="rp">Pick another time</button></p>`; $("#rp").onclick = () => { B.step = 2; render(c); }; }
  } finally { btn.disabled = !CONSENTS.every(([k]) => B.consent[k]); btn.innerHTML = label; }
}
function loadRzp() { return new Promise((res, rej) => { if (window.Razorpay) return res(); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = res; s.onerror = () => rej(new Error("Could not load the payment window. Please check your internet and try again.")); document.head.appendChild(s); }); }
async function openCheckout(h) {
  await loadRzp();
  await new Promise((resolve) => {
    const rz = new window.Razorpay({ key: h.key_id, amount: h.amount_paise, currency: "INR", order_id: h.order_id, name: "Lifeimpressions", description: `Advance for booking ${h.ref}`,
      prefill: { name: B.customer.name, email: B.customer.email, contact: B.customer.phone }, theme: { color: "#F26A0B" },
      modal: { ondismiss: () => { $("#pe").innerHTML = `<div class="note">Payment not completed. Your slot is held for a few minutes: press Pay again to retry.</div>`; resolve(); } },
      handler: async (r) => { try { await post("/verify", { token: h.token, razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature });
          const t = h.token; B.hold = null; B.step = 1; B.date = B.time = ""; B.pk = null; B.consent = {}; B.doorstep = false; B.quote = null; B.geo = null; B.door = ""; B.area = null; B.travelInBill = false; B.payFull = false; location.hash = `#/manage/${t}?new=1`; }
        catch (e) { $("#pe").innerHTML = `<div class="note bad">${esc(e.message)} Your booking reference is ${esc(h.ref)}. If money was debited, we will confirm by email, or call 875 444 9459.</div>`; } resolve(); } });
    rz.on && rz.on("payment.failed", (r) => { $("#pe").innerHTML = `<div class="note bad">${esc(r.error?.description || "Payment failed.")} You can try again.</div>`; });
    rz.open();
  });
}

// ---------- manage booking ----------
pages.manage = async (q, token) => {
  main.innerHTML = loading(); let b; try { b = (await api("/booking?token=" + encodeURIComponent(token))).booking; } catch (e) { main.innerHTML = failBox(e.message); return; }
  const live = b.status === "confirmed", future = Date.parse(b.start_at) > Date.now() + 24 * 3600e3;
  main.innerHTML = `<div class="wrap" style="max-width:720px;padding-top:34px;padding-bottom:70px"><div class="panel">
   ${q.get("new") && live ? `<div class="ok-box"><div class="tick">&#10003;</div><h1 style="font-size:2rem">You&rsquo;re booked!</h1><p class="hint">We have emailed your confirmation to ${esc(b.email)}.</p></div>` : `<h1 style="font-size:2rem">Your booking</h1>`}
   <p><span class="tag">${esc(b.status === "confirmed" ? "Confirmed" : b.status === "cancelled" ? "Cancelled" : b.status)}</span> &nbsp;Reference <b>${esc(b.ref)}</b></p>
   <dl class="kv"><dt>Service</dt><dd>${esc(b.service)}</dd><dt>When</dt><dd>${esc(b.when)}</dd><dt>Studio</dt><dd>${esc(b.location)}</dd><dt>Name</dt><dd>${esc(b.name)}</dd><dt>Total</dt><dd>${inr(b.total)}</dd><dt>Advance paid</dt><dd>${inr(b.advance)}</dd><dt>Balance at studio</dt><dd>${inr(b.balance)}</dd>${b.doorstep ? `<dt>Doorstep travel</dt><dd>${b.travel_estimate != null ? "about " + inr(b.travel_estimate) + " (" + b.distance_km + " km, up and down)" : "to be confirmed by our team"}<br><span class="hint" style="font-weight:400">${b.travel_in_bill ? "Included in your final bill, with no GST on travel. " : "Paid at your session. "}Toll and parking, if any, extra at actuals.</span></dd>` : ""}</dl>
   ${live && future ? `<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="rs" ${b.reschedule_count ? "disabled" : ""}>${b.reschedule_count ? "Already rescheduled" : "Reschedule"}</button><button class="btn ghost" id="cx">Cancel booking</button></div><div id="act" style="margin-top:20px"></div>` :
     live ? `<div class="note">Changes are possible up to 24 hours before the session. Please call 875 444 9459.</div>` : ""}
   <p class="hint" style="margin-top:22px">Bookmark this page. Questions? <a href="#/contact">Contact us</a>.</p></div></div>`;
  const act = $("#act"); if (!act) return;
  $("#rs") && ($("#rs").onclick = () => { const st = { location_id: b.location_id, service_id: b.service_id, token, date: "", time: "" };
    act.innerHTML = `<h3 style="margin-bottom:12px">Choose a new time</h3><div id="pk"></div><p style="margin-top:16px"><button class="btn primary" id="go" disabled>Confirm new time</button></p><div id="ae"></div>`;
    picker($("#pk"), st, () => { $("#go").disabled = !(st.date && st.time); });
    $("#go").onclick = async () => { $("#go").disabled = true; try { await post("/reschedule", { token, date: st.date, time: st.time }); pages.manage(new URLSearchParams(), token); } catch (e) { $("#ae").innerHTML = `<div class="note bad">${esc(e.message)}</div>`; $("#go").disabled = false; } }; });
  $("#cx").onclick = () => { act.innerHTML = `<div class="note bad"><b>Cancel this booking?</b> The advance is not automatically refunded (see <a href="#/policies/cancellation">policy</a>).</div><label for="rsn">Reason (optional)</label><input id="rsn"><p style="margin-top:14px"><button class="btn" id="yes">Yes, cancel</button> <button class="btn ghost" id="no">Keep booking</button></p><div id="ae"></div>`;
    $("#no").onclick = () => (act.innerHTML = ""); $("#yes").onclick = async () => { $("#yes").disabled = true; try { await post("/cancel", { token, reason: $("#rsn").value }); pages.manage(new URLSearchParams(), token); } catch (e) { $("#ae").innerHTML = `<div class="note bad">${esc(e.message)}</div>`; $("#yes").disabled = false; } }; };
};

// ---------- router ----------
const TITLES = { home: "Lifeimpressions | Baby hand & foot casting", services: "Services & prices", book: "Book a session", gallery: "Gallery", locations: "Our studios", shop: "Shop", franchise: "Franchise", contact: "Contact us", faq: "FAQ", manage: "Your booking" };
async function route() {
  const raw = location.hash.replace(/^#/, "") || "/", [path, qs] = raw.split("?"), q = new URLSearchParams(qs || ""), seg = path.split("/").filter(Boolean);
  const key = seg[0] || "home"; $("#wa").style.display = (key === "book" || key === "manage") ? "none" : ""; $("#nav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", "false");
  $$("nav a.l").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#/" + key));
  try {
    if (key === "policies") pages.policy(seg[1]); else if (key === "manage") await pages.manage(q, seg[1] || ""); else if (key === "book") await pages.book(q);
    else if (pages[key]) await pages[key](q); else await pages.home();
    document.title = key === "policies" ? (POL[seg[1]] || POL.terms)[0] + " | Lifeimpressions" : (TITLES[key] || TITLES.home) + (key === "home" ? "" : " | Lifeimpressions");
  } catch (e) { main.innerHTML = failBox(e.message || "Something went wrong."); }
  if (key !== "book") window.scrollTo(0, 0); main.focus({ preventScroll: true });
}
$("#burger").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
$("#yr").textContent = new Date().getFullYear(); $("#wa").href = "https://wa.me/91" + C.PHONE_1 + "?text=" + encodeURIComponent("Hi Lifeimpressions, I would like to know more about casting.");
$("#foot-contact").innerHTML = `<li><a href="tel:+91${C.PHONE_1}">875 444 9459</a></li><li><a href="mailto:${C.EMAIL}">${C.EMAIL}</a></li><li>${socials()}</li>`;
window.addEventListener("hashchange", route); route();
})();
