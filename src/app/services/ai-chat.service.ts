import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChatMessage } from '../models/chat.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  private conversationHistory: ChatMessage[] = [];

  // System prompt personalizado para Psyche en InnoPsi
  private readonly systemPrompt = `Eres "Psyche" 🌸, la asistente virtual de orientación, acompañamiento emocional y bienestar de InnoPsi, una plataforma dedicada a la psicología y la salud mental.

Tu personalidad:
- Empática, conversacional, cálida, respetuosa, muy cercana y serena.
- Hablas como una compañía atenta y comprensiva, no como una máquina fría.
- Respondes SIEMPRE en español con un tono tranquilizador, acogedor, humano y amigable.
- Usas emojis suaves relacionados con calma, afecto y bienestar de forma moderada 🌸 🌿 💜 🧘‍♀️ ✨ 😊.
- Eres concisa pero profunda y cálida (respuestas de entre 40 y 160 palabras para no abrumar).

Dinámica conversacional amigable (saludos y peticiones básicas):
- Saludos y cortesía: Responde con entusiasmo y calidez a saludos cotidianos ("hola", "buenos días", "buenas tardes", "buenas noches", "¿cómo estás?"). Pregúntale al usuario con ternura cómo se encuentra o cómo va su día.
- Peticiones ligeras y cotidianas:
  * Si te piden una frase motivadora, un pensamiento positivo o reflexión: compártelo con sensibilidad y afecto.
  * Si te piden un chiste o algo para sonreír: cuenta un chiste blanco, tierno o inocente (de humor suave) para distender la tensión y generar una sonrisa.
  * Si te agradecen ("gracias", "te lo agradezco"): responde con afecto genuino expresando que siempre estás disponible para escuchar.
  * Si te preguntan sobre ti ("¿quién eres?", "¿cómo te llamas?", "¿qué puedes hacer?"): preséntate como su aliada de bienestar en InnoPsi y explícale con sencillez cómo puedes acompañarle.
  * Si se despiden ("adiós", "hasta luego", "buenas noches"): deséales descanso, paz y recuérdales que aquí estarás cuando quieran volver a hablar.
- Flujo interactivo: Siempre que sea oportuno, cierra tus respuestas con una breve pregunta abierta o una invitación amorosa (ej. "¿Te gustaría contarme un poco más?", "¿Deseas que hagamos una pausa juntos?", "¿Cómo te hace sentir eso?") para que la conversación fluya de forma viva y natural.

Tu conocimiento y áreas de apoyo en InnoPsi:
- Apoyo y psicoeducación sobre manejo de ansiedad, estrés cotidiano y técnicas de respiración (técnica diafragmática y 4-7-8).
- Guía amigable sobre las funciones de la app InnoPsi:
  * "Horario Medicamentos": recordar tomas indicadas por su especialista.
  * "Estado emocional": registrar cómo se siente cada día y notar su evolución.
  * "Diario de seguimiento": plasmar vivencias, reflexiones y desahogarse mediante la escritura.
  * "Mensajes directos": comunicarse privadamente con su psicólogo/psiquiatra asignado.
- Promover hábitos de autocuidado, pausas conscientes e higiene del sueño.

Límites éticos y de seguridad OBLIGATORIOS (infranqueables pero comunicados con delicadeza):
- NUNCA emitas diagnósticos clínicos (ej. "tienes depresión mayor", "tienes trastorno bipolar").
- NUNCA recetes, ajustes ni sugieras medicamentos o fármacos.
- NUNCA te presentes como terapeuta humana ni reemplaces la terapia formal. Ante dudas médicas o clínicas, invita cordialmente a consultar a su especialista en "Mensajes directos".
- En situaciones de CRISIS SEVERA, ideación suicida o autolesión: Prioriza la seguridad de la persona, bríndale contención compasiva incondicional y dale de inmediato los números de ayuda en crisis (ej. Línea 106 / 192 en Colombia, o el 911/emergencias de su país), animándola a contactar a un ser querido o profesional presencialmente.`;

  private http = inject(HttpClient);

  constructor() {}

  /**
   * Envía un mensaje al asistente de IA y retorna la respuesta
   */
  sendMessage(userMessage: string): Observable<ChatMessage> {
    const rawApiKey = (environment as any).geminiApiKey || (environment as any).geminiapiKey || '';
    const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';

    // Agregar mensaje del usuario al historial
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userMsg);

    // Si no hay API key válida o tiene el placeholder de ejemplo, responder en modo offline dinámico
    if (!apiKey || apiKey === 'TU_API_KEY_AQUI' || apiKey === 'InnoPsi') {
      return this.getOfflineResponse(userMessage);
    }

    // Construir el cuerpo de la petición para Gemini API (gemini-2.0-flash)
    const contents = this.conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const payload = {
      system_instruction: {
        parts: [{ text: this.systemPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 500
      }
    };

    const endpoint = `${this.GEMINI_URL}?key=${apiKey}`;

    return this.http.post<any>(endpoint, payload).pipe(
      map(response => {
        const replyText =
          response?.candidates?.[0]?.content?.parts?.[0]?.text ||
          'Lo siento, no pude procesar una respuesta en este momento. Recuerda que estoy aquí para acompañarte 🌸.';

        const botMsg: ChatMessage = {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          content: replyText.trim(),
          timestamp: new Date()
        };

        this.conversationHistory.push(botMsg);
        return botMsg;
      }),
      catchError(error => {
        console.warn('[Psyche AI] Error en llamada a Gemini API, usando respuesta empática local:', error);
        return this.getOfflineResponse(userMessage);
      })
    );
  }

  /**
   * Genera una respuesta empática y dinámica local cuando no hay API key o no hay conexión
   */
  private getOfflineResponse(userMessage: string): Observable<ChatMessage> {
    const textLower = userMessage.toLowerCase().trim();
    let reply = '';

    // Crisis o autolesión
    if (
      textLower.includes('morir') ||
      textLower.includes('suicid') ||
      textLower.includes('matar') ||
      textLower.includes('acabar con todo') ||
      textLower.includes('no quiero vivir') ||
      textLower.includes('hacerme daño') ||
      textLower.includes('cortarme')
    ) {
      reply =
        'Tu vida tiene un valor inmenso y me importa mucho lo que estás sintiendo 💜. Por favor, no enfrentes este peso a solas; hay personas que desean cuidarte y acompañarte.\n\nComunícate ya mismo a una línea de apoyo en crisis (en Colombia: Línea 106 o 192; o el 911 / urgencias médicas de tu localidad), o escribe a tu especialista asignado en InnoPsi. No estás solo/a, busca ayuda en este instante 🌸.';
    }
    // Saludos específicos y estado
    else if (textLower.includes('buenos días') || textLower.includes('buen dia') || textLower.includes('buen día')) {
      reply =
        '¡Muy buenos días! ☀️🌸 Espero que hayas descansado. Qué lindo que comiences el día conectando contigo mismo/a. ¿Cómo te has despertado hoy y cómo te gustaría que fluya tu jornada?';
    } else if (textLower.includes('buenas tardes')) {
      reply =
        '¡Buenas tardes! 🌿 Espero que tu día vaya con calma. Recuerda hacer una pequeña pausa para estirarte y tomar un vaso de agua. ¿Cómo ha ido tu jornada hasta ahora?';
    } else if (textLower.includes('buenas noches') || textLower.includes('a dormir') || textLower.includes('me voy a acostar')) {
      reply =
        '¡Buenas noches! 🌙 Deseo que tengas un descanso reparador y muy tranquilo. Desconéctate un ratito de las pantallas y permite que tu mente repose. Mañana estaré aquí cuando despiertes ✨.';
    } else if (textLower.includes('cómo estás') || textLower.includes('como estas') || textLower.includes('qué tal estás') || textLower.includes('cómo te va')) {
      reply =
        '¡Estoy muy bien y feliz de saludarte! 😊🌸 Gracias por preguntar con tanta amabilidad. Mi mayor satisfacción es estar aquí para escucharte y acompañarte. ¿Y tú, cómo te encuentras en este momento?';
    } else if (textLower.includes('hola') || textLower.includes('hey') || textLower.includes('buenas') || textLower.includes('saludos')) {
      reply =
        '¡Hola! 🌸 Qué gusto saludarte. Soy Psyche, tu asistente de apoyo y bienestar en InnoPsi. Estoy aquí para escucharte sin juicios, darte ánimos o resolver dudas de tu app. ¿Cómo te sientes el día de hoy?';
    }
    // Chistes / humor sano / sonreír
    else if (textLower.includes('chiste') || textLower.includes('gracioso') || textLower.includes('sonreír') || textLower.includes('sonreir') || textLower.includes('broma')) {
      const jokes = [
        'Aquí va uno suave y tierno para tu corazón 🙈:\n\n— ¿Qué le dice una taza a otra? ☕\n— ¡Oye, qué café tan concentrado tienes hoy!\n\nEspero haberte sacado aunque sea una pequeña sonrisa. El humor es un gran bálsamo para relajar tensiones. ¿Cómo te sientes ahora? 🌸',
        'Un chiste inocente para alegrar el día 🌿:\n\n— ¿Qué le dice un jardinero a otro? 🌼\n— ¡Nos vemos cuando podamos!\n\nUna sonrisita siempre ayuda a distender el ánimo. ¿Qué tal va tu día? ✨'
      ];
      reply = jokes[Math.floor(Math.random() * jokes.length)];
    }
    // Frase motivadora / pensamiento positivo
    else if (textLower.includes('frase') || textLower.includes('motiva') || textLower.includes('positivo') || textLower.includes('ánimo') || textLower.includes('animo') || textLower.includes('inspiración')) {
      const quotes = [
        'Te regalo este pensamiento para hoy ✨:\n\n*«No tienes que poder con todo al mismo tiempo. Avanzar también significa aprender a respirar, tenerte paciencia y celebrar cada pequeño paso que das.»* 🌿💜\n\n¿Te hace sentido este recordatorio?',
        'Una reflexión con mucho cariño 🌸:\n\n*«El autocuidado no es una recompensa por haber sido productivo; es un derecho esencial para estar en paz contigo mismo.»* ✨\n\n¿Cómo puedes consentirte un poco el día de hoy?'
      ];
      reply = quotes[Math.floor(Math.random() * quotes.length)];
    }
    // Agradecimientos
    else if (textLower.includes('gracias') || textLower.includes('agradezco') || textLower.includes('muchas gracias')) {
      reply =
        '¡Es un placer enorme para mí! 💜 Saber que puedo aportarte un poquito de paz me alegra el día. Recuerda que siempre que necesites desahogarte o reflexionar, aquí estaré. ¿Hay algo más en lo que pueda apoyarte? 🌸';
    }
    // Despedidas
    else if (textLower.includes('adiós') || textLower.includes('adios') || textLower.includes('chao') || textLower.includes('hasta luego') || textLower.includes('nos vemos') || textLower.includes('bye')) {
      reply =
        '¡Hasta pronto! 🌸 Cuídate mucho y recuerda tratarte con amabilidad y paciencia. Estaré aquí esperándote cuando desees conversar de nuevo ✨.';
    }
    // Quién es / qué hace
    else if (textLower.includes('quién eres') || textLower.includes('quien eres') || textLower.includes('qué haces') || textLower.includes('que haces') || textLower.includes('cómo te llamas') || textLower.includes('qué puedes hacer')) {
      reply =
        '¡Soy Psyche! 🌸 Tu asistente virtual de acompañamiento y orientación en InnoPsi. Mis áreas de apoyo son:\n• Acompañarte en momentos de estrés o desánimo 💜\n• Guiarte en técnicas de respiración y relajación (como el ejercicio 4-7-8) 🧘‍♀️\n• Explicarte cómo usar tu Diario, Medicamentos o Estado emocional 📝\n• Darte pensamientos positivos y escucharte con empatía ✨\n\n¿Te gustaría que probemos alguna de estas funciones juntos?';
    }
    // Ansiedad / estrés
    else if (textLower.includes('ansiedad') || textLower.includes('ansioso') || textLower.includes('ansiosa') || textLower.includes('nervios') || textLower.includes('estrés') || textLower.includes('estres')) {
      reply =
        'Siento mucho que estés atravesando por esta ansiedad 💜. Recuerda algo muy importante: la ansiedad es una sensación física incómoda, pero es temporal y estás a salvo aquí.\n\nProbemos una pausa consciente: inhala profundo por la nariz en 4 segundos, retén el aire 4 segundos y suéltalo lento por la boca en 6 segundos 🌿. ¿Sientes que tus hombros y cuello empiezan a soltarse un poco?';
    }
    // Tristeza / desánimo
    else if (textLower.includes('triste') || textLower.includes('deprimid') || textLower.includes('llorar') || textLower.includes('desánimo') || textLower.includes('mal día')) {
      reply =
        'Comprendo tu dolor y agradezco que te abras conmigo 🌸. No tienes que fingir que todo está bien; está bien permitirte sentir tristeza y transitarla sin juzgarte.\n\nEscribir en el "Diario de seguimiento" de la app te puede ayudar a liberar nudos en la mente, o puedes dejarle un mensaje a tu psicólogo en "Mensajes directos". ¿Deseas contarme un poco sobre qué te tiene así? Estoy aquí para ti.';
    }
    // Respiración y calma
    else if (textLower.includes('respirar') || textLower.includes('respiración') || textLower.includes('respiracion') || textLower.includes('calma') || textLower.includes('ejercicio')) {
      reply =
        'Hagamos la técnica 4-7-8 🧘‍♀️:\n1. Inhala suavemente contando hasta 4 por la nariz.\n2. Sostén el aire 7 segundos con serenidad.\n3. Exhala completamente por la boca durante 8 segundos.\n\nRepitamos este ciclo 3 veces. Es maravilloso para avisarle a tu sistema nervioso que estás en calma ✨. ¿Lo practicamos?';
    }
    // Insomnio / dormir
    else if (textLower.includes('dormir') || textLower.includes('sueño') || textLower.includes('sueno') || textLower.includes('insomnio') || textLower.includes('desvelo')) {
      reply =
        'El insomnio puede ser muy desgastante 🌙. Prueba bajar el brillo del teléfono, estirar suavemente tu cuello y respirar lentamente inflando el abdomen.\n\nIntenta no forzar el sueño: concéntrate en descansar el cuerpo y las ideas. ¿Te gustaría que hagamos un breve ejercicio para aquietar la mente antes de dormir? ✨';
    }
    // Medicamentos
    else if (textLower.includes('medicamento') || textLower.includes('pastilla') || textLower.includes('dosis') || textLower.includes('receta')) {
      reply =
        'En la sección "Horario Medicamentos" de InnoPsi puedes revisar las indicaciones que tu especialista programó para ti 💊.\n\nPor tu propia seguridad, como asistente de IA no puedo indicarte dosis ni modificar tratamientos. Si tienes inquietudes sobre un medicamento, consulta con tu médico o especialista en "Mensajes directos". ¿Deseas orientación sobre cómo ver tu horario en la app? 🌸';
    }
    // Diario
    else if (textLower.includes('diario') || textLower.includes('escribir')) {
      reply =
        'El "Diario de seguimiento" es tu espacio íntimo y seguro 📝. Escribir no solo despeja la mente, sino que te permite ver tu evolución y llevar temas claros a tu próxima sesión terapéutica. ¿Te gustaría una idea de pregunta para reflexionar hoy en tu diario? 🌿';
    }
    // Especialista / Doctor
    else if (textLower.includes('especialista') || textLower.includes('doctor') || textLower.includes('psicólogo') || textLower.includes('psicologo') || textLower.includes('cita')) {
      reply =
        'Puedes comunicarte directamente con tu profesional en la pantalla de "Mensajes directos" 💬. Si sientes que necesitas una sesión pronta o tienes dudas clínicas, no dudes en escribirle por allí. ¿Necesitas ayuda para ubicarlo en la app? ✨';
    }
    // Respuesta por defecto dinámica
    else {
      reply =
        'Te escucho con atención y cariño 🌸. Como tu asistente Psyche, puedo ayudarte con ejercicios de calma, reflexiones para tu día, guiarte por las herramientas de InnoPsi o simplemente conversar un ratito. ¿Hay algo en especial de lo que te gustaría que hablemos? ✨';
    }

    const botMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'assistant',
      content: reply,
      timestamp: new Date()
    };

    this.conversationHistory.push(botMsg);
    return of(botMsg);
  }

  /**
   * Obtiene el historial de conversación actual
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Reinicia la conversación
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}
