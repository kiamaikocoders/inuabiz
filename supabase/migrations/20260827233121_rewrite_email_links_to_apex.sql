-- Till and admin live on the apex (inuabiz.co.ke), not app. / admin. subdomains.

update public.communication_templates
set
  html = replace(
    replace(html, 'https://app.inuabiz.co.ke', 'https://inuabiz.co.ke'),
    'https://admin.inuabiz.co.ke',
    'https://inuabiz.co.ke'
  )
where html like '%://app.inuabiz.co.ke%'
   or html like '%://admin.inuabiz.co.ke%';
