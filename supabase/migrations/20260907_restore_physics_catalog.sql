-- Restore the Physics catalog and make Light a standalone bilingual lesson.
insert into public.academic_subject_catalog
  (subject_name, streams, paper_components, enabled, display_name_en, display_name_si, source_label, source_url, verification_status, updated_at)
values
  ('Physics', array['Physical Science','Biological Science']::text[], array['MCQ','Structured / Essay']::text[], true, 'Physics', 'භෞතික විද්‍යාව', 'National Institute of Education, Sri Lanka', 'https://nie.lk/selesyll?helixMode=edit', 'needs_review', now())
on conflict (subject_name) do update set
  streams=excluded.streams, paper_components=excluded.paper_components, enabled=true,
  display_name_en=excluded.display_name_en, display_name_si=excluded.display_name_si, updated_at=now();

with topics(topic_key,title_en,title_si,unit_name,sort_order) as (values
  ('PHY-01','Measurement','මිනුම්','Unit 01',10),
  ('PHY-02','Mechanics','යාන්ත්‍ර විද්‍යාව','Unit 02',20),
  ('PHY-03','Oscillations & Waves','දෝලන හා තරංග','Unit 03',30),
  ('PHY-LIGHT','Light','ආලෝකය','Unit 03 · Light',35),
  ('PHY-04','Thermal Physics','තාප භෞතික විද්‍යාව','Unit 04',40),
  ('PHY-05','Gravitational Field','ගුරුත්වාකර්ෂණ ක්ෂේත්‍රය','Unit 05',50),
  ('PHY-06','Electrostatic Field','විද්‍යුත් ස්ථිතික ක්ෂේත්‍රය','Unit 06',60),
  ('PHY-07','Magnetic Field','චුම්බක ක්ෂේත්‍රය','Unit 07',70),
  ('PHY-08','Current Electricity','ධාරා විද්‍යුතය','Unit 08',80),
  ('PHY-09','Electronics','ඉලෙක්ට්‍රොනික විද්‍යාව','Unit 09',90),
  ('PHY-10','Mechanical Properties of Matter','පදාර්ථයේ යාන්ත්‍රික ගුණ','Unit 10',100),
  ('PHY-11','Matter & Radiation','පදාර්ථය හා විකිරණ','Unit 11',110)
)
insert into public.academic_topic_catalog
  (subject_name,topic_key,title_en,title_si,unit_name,sort_order,enabled,source_label,source_url,verification_status,updated_at)
select 'Physics',topic_key,title_en,title_si,unit_name,sort_order,true,'National Institute of Education, Sri Lanka','https://nie.lk/selesyll?helixMode=edit','needs_review',now() from topics
on conflict(subject_name,topic_key) do update set title_en=excluded.title_en,title_si=excluded.title_si,unit_name=excluded.unit_name,sort_order=excluded.sort_order,enabled=true,updated_at=now();

-- Retire the temporary key that was created while the rest of Physics was absent.
update public.academic_topic_catalog set enabled=false,updated_at=now()
where subject_name='Physics' and topic_key='physics-light';

with subs(topic_key,subtopic_key,title_en,title_si,sort_order) as (values
 ('PHY-01','PHY-01-1','SI units','SI ඒකක',10),('PHY-01','PHY-01-2','Dimensions','මාන',20),('PHY-01','PHY-01-3','Measuring instruments','මිනුම් උපකරණ',30),('PHY-01','PHY-01-4','Errors and uncertainty','දෝෂ හා අවිනිශ්චිතතාව',40),
 ('PHY-02','PHY-02-1','Kinematics','චලිත විද්‍යාව',10),('PHY-02','PHY-02-2','Forces','බල',20),('PHY-02','PHY-02-3','Momentum','ගම්‍යතාව',30),('PHY-02','PHY-02-4','Work and energy','කාර්යය හා ශක්තිය',40),('PHY-02','PHY-02-5','Rotational mechanics','භ්‍රමණ යාන්ත්‍ර විද්‍යාව',50),('PHY-02','PHY-02-6','Fluid mechanics','ද්‍රව යාන්ත්‍ර විද්‍යාව',60),
 ('PHY-03','PHY-03-1','SHM','සරල අනුවර්තී චලිතය',10),('PHY-03','PHY-03-2','Wave motion','තරංග චලිතය',20),('PHY-03','PHY-03-3','Sound','ශබ්දය',30),('PHY-03','PHY-03-4','Interference','අන්තරායනය',40),('PHY-03','PHY-03-5','Diffraction','විවර්තනය',50),
 ('PHY-LIGHT','PHY-LIGHT-1','Propagation of light','ආලෝකයේ ප්‍රචාරණය',10),('PHY-LIGHT','PHY-LIGHT-2','Reflection','පරාවර්තනය',20),('PHY-LIGHT','PHY-LIGHT-3','Refraction','වර්තනය',30),('PHY-LIGHT','PHY-LIGHT-4','Total internal reflection','පූර්ණ අභ්‍යන්තර පරාවර්තනය',40),('PHY-LIGHT','PHY-LIGHT-5','Prisms and dispersion','ප්‍රිස්ම හා වර්ණ වික්ෂේපණය',50),('PHY-LIGHT','PHY-LIGHT-6','Spherical mirrors','ගෝලීය දර්පණ',60),('PHY-LIGHT','PHY-LIGHT-7','Thin lenses','තුනී කාච',70),('PHY-LIGHT','PHY-LIGHT-8','Optical instruments','ප්‍රකාශ උපකරණ',80),('PHY-LIGHT','PHY-LIGHT-9','Interference','අන්තරායනය',90),('PHY-LIGHT','PHY-LIGHT-10','Diffraction','විවර්තනය',100),('PHY-LIGHT','PHY-LIGHT-11','Polarization','ධ්‍රැවණය',110),
 ('PHY-04','PHY-04-1','Temperature','උෂ්ණත්වය',10),('PHY-04','PHY-04-2','Thermal expansion','තාප ප්‍රසාරණය',20),('PHY-04','PHY-04-3','Calorimetry','තාපමානමිතිය',30),('PHY-04','PHY-04-4','Gas laws','වායු නීති',40),('PHY-04','PHY-04-5','Thermodynamics','තාපගති විද්‍යාව',50),
 ('PHY-05','PHY-05-1','Field strength','ක්ෂේත්‍ර තීව්‍රතාව',10),('PHY-05','PHY-05-2','Potential','විභවය',20),('PHY-05','PHY-05-3','Satellites','උපග්‍රහ',30),('PHY-05','PHY-05-4','Planetary motion','ග්‍රහ චලිතය',40),
 ('PHY-06','PHY-06-1','Coulomb law','කූලොම්බ් නීතිය',10),('PHY-06','PHY-06-2','Electric field','විද්‍යුත් ක්ෂේත්‍රය',20),('PHY-06','PHY-06-3','Potential','විභවය',30),('PHY-06','PHY-06-4','Capacitance','ධාරිතාව',40),
 ('PHY-07','PHY-07-1','Magnetic force','චුම්බක බලය',10),('PHY-07','PHY-07-2','Fields due to currents','ධාරා නිසා ඇති ක්ෂේත්‍ර',20),('PHY-07','PHY-07-3','Electromagnetic induction','විද්‍යුත් චුම්බක ප්‍රේරණය',30),('PHY-07','PHY-07-4','AC principles','ප්‍රත්‍යාවර්ත ධාරා මූලධර්ම',40),
 ('PHY-08','PHY-08-1','Current and resistance','ධාරාව හා ප්‍රතිරෝධය',10),('PHY-08','PHY-08-2','DC circuits','සෘජු ධාරා පරිපථ',20),('PHY-08','PHY-08-3','Kirchhoff laws','කර්චොෆ් නීති',30),('PHY-08','PHY-08-4','Electrical measurements','විද්‍යුත් මිනුම්',40),
 ('PHY-09','PHY-09-1','Semiconductors','අර්ධ සන්නායක',10),('PHY-09','PHY-09-2','Diodes','ඩයෝඩ',20),('PHY-09','PHY-09-3','Transistors','ට්‍රාන්සිස්ටර',30),('PHY-09','PHY-09-4','Operational circuits','ක්‍රියාකාරී පරිපථ',40),('PHY-09','PHY-09-5','Digital electronics','ඩිජිටල් ඉලෙක්ට්‍රොනික විද්‍යාව',50),
 ('PHY-10','PHY-10-1','Elasticity','ප්‍රත්‍යාස්ථතාව',10),('PHY-10','PHY-10-2','Surface tension','පෘෂ්ඨ ආතතිය',20),('PHY-10','PHY-10-3','Viscosity','දුස්ස්‍රාවිතාව',30),('PHY-10','PHY-10-4','Material behaviour','ද්‍රව්‍ය හැසිරීම',40),
 ('PHY-11','PHY-11-1','Thermal radiation','තාප විකිරණ',10),('PHY-11','PHY-11-2','Photoelectric effect','ප්‍රකාශ විද්‍යුත් ආචරණය',20),('PHY-11','PHY-11-3','Matter waves','පදාර්ථ තරංග',30),('PHY-11','PHY-11-4','X-rays','එක්ස් කිරණ',40),('PHY-11','PHY-11-5','Radioactivity','විකිරණශීලීතාව',50),('PHY-11','PHY-11-6','Nuclear physics','න්‍යෂ්ටික භෞතික විද්‍යාව',60)
)
insert into public.academic_subtopic_catalog
 (subject_name,topic_key,subtopic_key,title_en,title_si,sort_order,enabled,source_label,source_url,verification_status,updated_at)
select 'Physics',topic_key,subtopic_key,title_en,title_si,sort_order,true,'National Institute of Education, Sri Lanka','https://nie.lk/selesyll?helixMode=edit','needs_review',now() from subs
on conflict(subject_name,topic_key,subtopic_key) do update set title_en=excluded.title_en,title_si=excluded.title_si,sort_order=excluded.sort_order,enabled=true,updated_at=now();
