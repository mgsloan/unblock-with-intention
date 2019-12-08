const filter = {
  urls: [
    '*://*.reddit.com/*',
    '*://facebook.com/*',
    '*://*.facebook.com/*',
  ],
};

const opt = ['blocking'];

const blockInfo = {};

chrome.webRequest.onBeforeRequest.addListener(
  req => {
    if (req.method === 'GET') {
      const baseDomain = removeSubdomain(new URL(req.url).hostname);
      const info = blockInfo[baseDomain];
      console.log('block info = ', info);
      if (info) {
        if (new Date() < info.expiry) {
          console.log('blocking paused for', baseDomain, 'so allowing request.');
          return {}
        }
        console.log('deleting expired blockinfo');
        delete blockInfo[baseDomain];
      }
      console.log('page blocked - ' + req.method + ' ' + req.url);
      return {
        redirectUrl: 'https://mgsloan.com/start-page.html?blocked=' + encodeURI(req.url)
      };
    } else {
      console.log('non GET request to blocked page allowed - ' + req.method + ' ' + req.url);
      return {};
    }
  },
  filter,
  opt
);

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log('Received', request);
    switch (request.type) {
      case 'GET_PAUSE_INFO': {
        sendResponse(blockInfo[removeSubdomain(request.host)]);
        break;
      }
      case 'PAUSE_BLOCKING': {
        const baseDomain = removeSubdomain(new URL(request.blockedUrl).hostname);
        const intention = request.intention;
        const now = new Date();
        const expiry = new Date(now.getTime() + 60000 * parseInt(request.time));
        blockInfo[baseDomain] = { intention, expiry };
        sendResponse('REDIRECT');
        break;
      }
      default: {
        console.error('Unexpected request: ', request);
      }
    }
  });





// Not perfect, but good enough for me
//
// https://stackoverflow.com/a/45214334/1164871

var firstTLDs  = "ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|be|bf|bg|bh|bi|bj|bm|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|cl|cm|cn|co|cr|cu|cv|cw|cx|cz|de|dj|dk|dm|do|dz|ec|ee|eg|es|et|eu|fi|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|im|in|io|iq|ir|is|it|je|jo|jp|kg|ki|km|kn|kp|kr|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|na|nc|ne|nf|ng|nl|no|nr|nu|nz|om|pa|pe|pf|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|yt".split('|');
var secondTLDs = "com|edu|gov|net|mil|org|nom|sch|caa|res|off|gob|int|tur|ip6|uri|urn|asn|act|nsw|qld|tas|vic|pro|biz|adm|adv|agr|arq|art|ato|bio|bmd|cim|cng|cnt|ecn|eco|emp|eng|esp|etc|eti|far|fnd|fot|fst|g12|ggf|imb|ind|inf|jor|jus|leg|lel|mat|med|mus|not|ntr|odo|ppg|psc|psi|qsl|rec|slg|srv|teo|tmp|trd|vet|zlg|web|ltd|sld|pol|fin|k12|lib|pri|aip|fie|eun|sci|prd|cci|pvt|mod|idv|rel|sex|gen|nic|abr|bas|cal|cam|emr|fvg|laz|lig|lom|mar|mol|pmn|pug|sar|sic|taa|tos|umb|vao|vda|ven|mie|北海道|和歌山|神奈川|鹿児島|ass|rep|tra|per|ngo|soc|grp|plc|its|air|and|bus|can|ddr|jfk|mad|nrw|nyc|ski|spy|tcm|ulm|usa|war|fhs|vgs|dep|eid|fet|fla|flå|gol|hof|hol|sel|vik|cri|iwi|ing|abo|fam|gok|gon|gop|gos|aid|atm|gsm|sos|elk|waw|est|aca|bar|cpa|jur|law|sec|plo|www|bir|cbg|jar|khv|msk|nov|nsk|ptz|rnd|spb|stv|tom|tsk|udm|vrn|cmw|kms|nkz|snz|pub|fhv|red|ens|nat|rns|rnu|bbs|tel|bel|kep|nhs|dni|fed|isa|nsn|gub|e12|tec|орг|обр|упр|alt|nis|jpn|mex|ath|iki|nid|gda|inc".split('|');

var removeSubdomain = function (s) {
    s = s.replace(/^www\./, '');

    var parts = s.split('.');

    while (parts.length > 3) {
        parts.shift();
    }

    if (parts.length === 3 && ((parts[1].length > 2 && parts[2].length > 2) || (secondTLDs.indexOf(parts[1]) === -1) && firstTLDs.indexOf(parts[2]) === -1)) {
        parts.shift();
    }

    return parts.join('.');
};
