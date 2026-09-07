update public.academic_topic_catalog set enabled=false,updated_at=now() where subject_name='Physics' and topic_key='PHY-02';

insert into public.academic_topic_catalog(subject_name,topic_key,title_en,title_si,unit_name,sort_order,enabled,verification_status)
values
('Physics','PHY-02A','Kinematics','චලිත විද්‍යාව','Unit 02A',20,true,'needs_review'),
('Physics','PHY-02B','Forces','බල','Unit 02B',21,true,'needs_review'),
('Physics','PHY-02C','Momentum','ගම්‍යතාව','Unit 02C',22,true,'needs_review'),
('Physics','PHY-02D','Work and Energy','කාර්යය හා ශක්තිය','Unit 02D',23,true,'needs_review'),
('Physics','PHY-02E','Rotational Mechanics','භ්‍රමණ යාන්ත්‍ර විද්‍යාව','Unit 02E',24,true,'needs_review'),
('Physics','PHY-02F','Fluid Mechanics','ද්‍රව යාන්ත්‍ර විද්‍යාව','Unit 02F',25,true,'needs_review')
on conflict(subject_name,topic_key) do update set title_en=excluded.title_en,title_si=excluded.title_si,unit_name=excluded.unit_name,sort_order=excluded.sort_order,enabled=true,updated_at=now();

insert into public.academic_subtopic_catalog(subject_name,topic_key,subtopic_key,title_en,title_si,sort_order,enabled,verification_status)
values
('Physics','PHY-02A','PHY-02A-1','Motion in one dimension','ඒකමාන චලිතය',10,true,'needs_review'),
('Physics','PHY-02A','PHY-02A-2','Motion graphs','චලිත ප්‍රස්තාර',20,true,'needs_review'),
('Physics','PHY-02A','PHY-02A-3','Projectile motion','ප්‍රක්ෂේප චලිතය',30,true,'needs_review'),
('Physics','PHY-02B','PHY-02B-1','Newton''s laws','නිව්ටන් නියම',10,true,'needs_review'),
('Physics','PHY-02B','PHY-02B-2','Friction','ඝර්ෂණය',20,true,'needs_review'),
('Physics','PHY-02B','PHY-02B-3','Equilibrium of forces','බල සමතුලිතතාව',30,true,'needs_review'),
('Physics','PHY-02C','PHY-02C-1','Linear momentum','රේඛීය ගම්‍යතාව',10,true,'needs_review'),
('Physics','PHY-02C','PHY-02C-2','Impulse','ආවේගය',20,true,'needs_review'),
('Physics','PHY-02C','PHY-02C-3','Collisions and conservation','ගැටීම් හා සංස්ථිතිය',30,true,'needs_review'),
('Physics','PHY-02D','PHY-02D-1','Work','කාර්යය',10,true,'needs_review'),
('Physics','PHY-02D','PHY-02D-2','Kinetic and potential energy','චාලක හා විභව ශක්තිය',20,true,'needs_review'),
('Physics','PHY-02D','PHY-02D-3','Power and energy conservation','ක්ෂමතාව හා ශක්ති සංස්ථිතිය',30,true,'needs_review'),
('Physics','PHY-02E','PHY-02E-1','Angular motion','කෝණික චලිතය',10,true,'needs_review'),
('Physics','PHY-02E','PHY-02E-2','Torque','ව්‍යාවර්තය',20,true,'needs_review'),
('Physics','PHY-02E','PHY-02E-3','Angular momentum','කෝණික ගම්‍යතාව',30,true,'needs_review'),
('Physics','PHY-02F','PHY-02F-1','Pressure in fluids','ද්‍රව පීඩනය',10,true,'needs_review'),
('Physics','PHY-02F','PHY-02F-2','Buoyancy','උත්ප්ලාවකතාව',20,true,'needs_review'),
('Physics','PHY-02F','PHY-02F-3','Fluid flow','ද්‍රව ප්‍රවාහය',30,true,'needs_review')
on conflict(subject_name,topic_key,subtopic_key) do update set title_en=excluded.title_en,title_si=excluded.title_si,sort_order=excluded.sort_order,enabled=true,updated_at=now();
