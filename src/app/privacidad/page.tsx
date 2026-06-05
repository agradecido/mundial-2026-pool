export const metadata = {
  title: "Política de privacidad — Porra Mundial 2026",
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Política de privacidad</h1>
        <p className="mt-1 text-xs text-gray-500">Última actualización: 5 de junio de 2026</p>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed">
        La presente Política de Privacidad del sitio web <span className="text-gray-300">porramundial.mdv.red</span> detalla cómo se recopilan, utilizan, protegen y tratan los datos personales de los usuarios que acceden y utilizan esta plataforma de quiniela/porra del mundial de fútbol.
      </p>
      <p className="text-sm text-gray-400 leading-relaxed">
        El titular garantiza el cumplimiento del <strong className="text-gray-300">Reglamento (UE) 2016/679 (RGPD)</strong> y la <strong className="text-gray-300">Ley Orgánica 3/2018 (LOPDGDD)</strong>.
      </p>

      <Section title="1. Responsable del tratamiento">
        <ul className="space-y-1.5 text-sm text-gray-400">
          <li><span className="text-gray-500">Titular:</span> Persona física particular</li>
          <li><span className="text-gray-500">Contacto:</span> <a href="mailto:porramundial2026@outlook.com" className="text-[#00e87a] hover:underline">porramundial2026@outlook.com</a></li>
          <li><span className="text-gray-500">Dirección postal:</span> Disponible bajo solicitud justificada al correo anterior.</li>
        </ul>
      </Section>

      <Section title="2. Datos personales que recopilamos">
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400 marker:text-gray-600">
          <li><strong className="text-gray-300">Identificación:</strong> nombre, nombre de usuario o pseudónimo.</li>
          <li><strong className="text-gray-300">Contacto y acceso:</strong> correo electrónico y contraseña (almacenada de forma encriptada).</li>
          <li><strong className="text-gray-300">Autenticación de terceros:</strong> si usas Google Auth, recibiremos tu nombre y email de esa cuenta.</li>
          <li><strong className="text-gray-300">Técnicos y de navegación:</strong> dirección IP y datos del dispositivo para seguridad y estabilidad.</li>
        </ul>
      </Section>

      <Section title="3. Finalidad del tratamiento">
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400 marker:text-gray-600">
          <li><strong className="text-gray-300">Gestión de cuenta:</strong> registrar y mantener tu cuenta de usuario.</li>
          <li><strong className="text-gray-300">Dinámica del juego:</strong> mostrar clasificaciones, rankings y puntuaciones; tu nickname y predicciones serán visibles para otros participantes.</li>
          <li><strong className="text-gray-300">Comunicaciones del servicio:</strong> avisos técnicos o informativos sobre el juego (jornadas, resultados, contraseñas).</li>
          <li><strong className="text-gray-300">Comunicaciones promocionales:</strong> solo con tu consentimiento, novedades o newsletters del titular.</li>
          <li><strong className="text-gray-300">Seguridad:</strong> detectar y evitar usos fraudulentos o accesos no autorizados.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">Esta webapp es totalmente gratuita. No tratamos datos bancarios ni gestionamos suscripciones económicas.</p>
      </Section>

      <Section title="4. Legitimación para el tratamiento">
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400 marker:text-gray-600">
          <li><strong className="text-gray-300">Ejecución de contrato / relación de servicio:</strong> el tratamiento de tus datos de registro y juego es necesario para ofrecerte la participación en la porra.</li>
          <li><strong className="text-gray-300">Interés legítimo:</strong> registro de IP y datos de navegación para seguridad informática y prevención de fraudes.</li>
        </ul>
      </Section>

      <Section title="5. Conservación de los datos">
        <p className="text-sm text-gray-400 leading-relaxed">
          Los datos se conservarán mientras la cuenta esté activa y, posteriormente, el tiempo necesario para cumplir obligaciones legales o defenderse ante reclamaciones, tras lo cual serán eliminados o anonimizados.
        </p>
      </Section>

      <Section title="6. Destinatarios y cesión de datos">
        <p className="text-sm text-gray-400 leading-relaxed">
          <strong className="text-gray-300">No compartimos tus datos con terceros.</strong> No son vendidos, alquilados ni cedidos con fines comerciales. Solo podrán comunicarse a autoridades competentes ante obligación legal o requerimiento judicial.
        </p>
      </Section>

      <Section title="7. Derechos de los usuarios">
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400 marker:text-gray-600">
          <li><strong className="text-gray-300">Acceso:</strong> conocer qué datos tratamos y con qué finalidad.</li>
          <li><strong className="text-gray-300">Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong className="text-gray-300">Supresión ("derecho al olvido"):</strong> solicitar el borrado de todos tus datos.</li>
          <li><strong className="text-gray-300">Limitación:</strong> suspender temporalmente el tratamiento en determinados casos.</li>
          <li><strong className="text-gray-300">Oposición:</strong> oponerte al uso de datos para finalidades específicas.</li>
          <li><strong className="text-gray-300">Portabilidad:</strong> recibir tus datos en formato estructurado para transferirlos a otro responsable.</li>
        </ul>
        <p className="mt-3 text-sm text-gray-400 leading-relaxed">
          Para ejercer cualquiera de estos derechos, escríbenos a <a href="mailto:porramundial2026@outlook.com" className="text-[#00e87a] hover:underline">porramundial2026@outlook.com</a> indicando tu nombre de usuario y el derecho que deseas ejercer. También puedes reclamar ante la <strong className="text-gray-300">Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" className="text-[#00e87a] hover:underline" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.
        </p>
      </Section>

      <Section title="8. Seguridad de los datos">
        <p className="text-sm text-gray-400 leading-relaxed">
          Aplicamos medidas técnicas y organizativas para proteger tus datos frente a alteración, pérdida o acceso no autorizado. Las contraseñas se almacenan mediante encriptación segura y el sitio usa certificado SSL para cifrar la transmisión de datos.
        </p>
      </Section>

      <Section title="9. Modificaciones de la política">
        <p className="text-sm text-gray-400 leading-relaxed">
          Nos reservamos el derecho a modificar esta política para adaptarla a cambios legislativos o técnicos. Cualquier cambio significativo será comunicado a través de la plataforma o por correo electrónico.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider border-b border-white/10 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
