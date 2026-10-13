/**
 * =========================================================================
 * 05_DriveService.js - Gestión jerárquica de carpetas y fotos en Google Drive (YYYY-MM/OP-XXXXX)
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

/**
 * GESTIÓN DE GOOGLE DRIVE: JERARQUÍA RAÍZ -> MES -> OP
 */
function getRootDriveFolder() {
  var folderId = (typeof TARGET_DRIVE_FOLDER_ID !== 'undefined' && TARGET_DRIVE_FOLDER_ID) ? TARGET_DRIVE_FOLDER_ID : TARGET_DRIVE_SPREADSHEET_OR_FOLDER_ID;
  if (folderId && String(folderId).trim().length > 5) {
    try {
      var candidate = DriveApp.getFileById(String(folderId).trim());
      if (candidate.getMimeType() === 'application/vnd.google-apps.folder') {
        return DriveApp.getFolderById(String(folderId).trim());
      }
      var parents = candidate.getParents();
      if (parents.hasNext()) {
        var parentFolder = parents.next();
        var subFolders = parentFolder.getFoldersByName(DRIVE_FOLDER_NAME);
        if (subFolders.hasNext()) return subFolders.next();
        var createdInParent = parentFolder.createFolder(DRIVE_FOLDER_NAME);
        createdInParent.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return createdInParent;
      }
    } catch (err) {
      console.warn('Aviso: Pasando a Mi Unidad de Drive:', err);
    }
  }

  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  var newFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function parseHistoricalDate(dateInput, mesInput) {
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
  if (dateInput && typeof dateInput === 'string') {
    var trimmed = dateInput.trim();
    var parts = trimmed.split(/[\/\-\s]/);
    if (parts.length >= 3) {
      var d = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10) - 1;
      var y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11) {
        return new Date(y, m, d);
      }
    }
    var dObj = new Date(trimmed);
    if (!isNaN(dObj.getTime())) return dObj;
  }
  if (mesInput && !isNaN(Number(mesInput))) {
    var mNum = Number(mesInput) - 1;
    if (mNum >= 0 && mNum <= 11) {
      return new Date(new Date().getFullYear(), mNum, 1);
    }
  }
  return new Date();
}

function getMonthDriveFolder(rootFolder, dateInput) {
  var d = (dateInput instanceof Date && !isNaN(dateInput.getTime())) ? dateInput : parseHistoricalDate(dateInput);
  var monthsEs = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  var folderName = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + ' - ' + monthsEs[d.getMonth()];
  var subFolders = rootFolder.getFoldersByName(folderName);
  if (subFolders.hasNext()) return subFolders.next();
  var created = rootFolder.createFolder(folderName);
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return created;
}

function getOpDriveFolder(monthFolder, rawOp) {
  var cleanOp = String(rawOp || 'OP-GENERAL').trim().toUpperCase();
  if (cleanOp.indexOf('OP-') !== 0) cleanOp = 'OP-' + cleanOp.replace(/^OP-?/i, '').trim();

  // 1. Coincidencia exacta por nombre de carpeta
  var subFolders = monthFolder.getFoldersByName(cleanOp);
  if (subFolders.hasNext()) return subFolders.next();

  // 2. Coincidencia numérica robusta (previene duplicar carpetas como OP-96263 vs OP-00096263)
  var rawDigits = cleanOp.replace(/\D/g, '');
  if (rawDigits) {
    var rawInt = parseInt(rawDigits, 10);
    var allSubs = monthFolder.getFolders();
    while (allSubs.hasNext()) {
      var sFolder = allSubs.next();
      var sDigits = sFolder.getName().replace(/\D/g, '');
      if (sDigits && parseInt(sDigits, 10) === rawInt) {
        return sFolder;
      }
    }
  }

  // 3. Crear nueva carpeta oficial si no existe
  var created = monthFolder.createFolder(cleanOp);
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return created;
}

function saveImageToDriveHierarchical(base64Data, fileName, rawOp, dateInput, isSingleFinalPhoto) {
  try {
    if (!base64Data || base64Data.length < 50) return { driveUrl: '', folderUrl: '' };
    var root = getRootDriveFolder();
    var monthFolder = getMonthDriveFolder(root, dateInput);
    var opFolder = getOpDriveFolder(monthFolder, rawOp);

    // =========================================================================
    // REGLA ESTRICTA DE CONTROL DE CALIDAD: MÁXIMO 2 FOTOS POR OP EN DRIVE
    // Slot 1: _MUESTRA_INICIAL.jpg | Slot 2: _POST_LAVADO_CALIDAD.jpg
    // Cada slot solo reemplaza su propia versión anterior; NUNCA se elimina la otra foto.
    // =========================================================================
    if (fileName.indexOf('POST_LAVADO') !== -1) {
      var filesPost = opFolder.getFiles();
      while (filesPost.hasNext()) {
        var fPost = filesPost.next();
        if (fPost.getName().indexOf('POST_LAVADO') !== -1) {
          try { fPost.setTrashed(true); } catch (ePostTrash) {}
        }
      }
    }

    if (fileName.indexOf('MUESTRA_INICIAL') !== -1) {
      var filesInit = opFolder.getFiles();
      while (filesInit.hasNext()) {
        var fInit = filesInit.next();
        if (fInit.getName().indexOf('MUESTRA_INICIAL') !== -1) {
          try { fInit.setTrashed(true); } catch (eInitTrash) {}
        }
      }
    }

    if (fileName.indexOf('PRENDA_TERMINADA_1') !== -1) {
      var filesPt1 = opFolder.getFiles();
      while (filesPt1.hasNext()) {
        var fPt1 = filesPt1.next();
        if (fPt1.getName().indexOf('PRENDA_TERMINADA_1') !== -1) {
          try { fPt1.setTrashed(true); } catch (ePt1Trash) {}
        }
      }
    }

    if (fileName.indexOf('PRENDA_TERMINADA_2') !== -1) {
      var filesPt2 = opFolder.getFiles();
      while (filesPt2.hasNext()) {
        var fPt2 = filesPt2.next();
        if (fPt2.getName().indexOf('PRENDA_TERMINADA_2') !== -1) {
          try { fPt2.setTrashed(true); } catch (ePt2Trash) {}
        }
      }
    }

    // Por seguridad, eliminar cualquier archivo con el nombre exacto fileName
    var exactFiles = opFolder.getFilesByName(fileName);
    while (exactFiles.hasNext()) {
      var exactFile = exactFiles.next();
      try { exactFile.setTrashed(true); } catch (eExactTrash) {}
    }

    var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
    var file = opFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      driveUrl: 'https://drive.google.com/uc?id=' + file.getId(),
      folderUrl: opFolder.getUrl(),
      fileId: file.getId()
    };
  } catch (e) {
    console.error('Error guardando imagen en Google Drive:', e);
    return { driveUrl: '', folderUrl: '' };
  }
}

/**
 * Recorre todas las carpetas de OPs en Drive y depura archivos duplicados,
 * garantizando que en cada carpeta de OP existan estrictamente como máximo 2 fotos:
 * 1. OP-XXXXX_MUESTRA_INICIAL.jpg
 * 2. OP-XXXXX_POST_LAVADO_CALIDAD.jpg
 */
function cleanAllOpFolderDuplicatesInDrive() {
  try {
    var root = getRootDriveFolder();
    var monthFolders = root.getFolders();
    var totalCleaned = 0;

    while (monthFolders.hasNext()) {
      var mFolder = monthFolders.next();
      var opFolders = mFolder.getFolders();

      while (opFolders.hasNext()) {
        var opFolder = opFolders.next();
        var files = opFolder.getFiles();
        var postLavadoFiles = [];
        var muestraInicialFiles = [];

        while (files.hasNext()) {
          var f = files.next();
          var fName = f.getName().toUpperCase();
          if (fName.indexOf('POST_LAVADO') !== -1) {
            postLavadoFiles.push(f);
          } else if (fName.indexOf('MUESTRA_INICIAL') !== -1) {
            muestraInicialFiles.push(f);
          }
        }

        // Si hay más de 1 post lavado, ordenar por fecha descendente y mandar los antiguos a la papelera
        if (postLavadoFiles.length > 1) {
          postLavadoFiles.sort(function(a, b) {
            return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
          });
          for (var p = 1; p < postLavadoFiles.length; p++) {
            try {
              postLavadoFiles[p].setTrashed(true);
              totalCleaned++;
            } catch (eTrashP) {}
          }
        }

        // Si hay más de 1 muestra inicial, mandar los antiguos a la papelera
        if (muestraInicialFiles.length > 1) {
          muestraInicialFiles.sort(function(a, b) {
            return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
          });
          for (var m = 1; m < muestraInicialFiles.length; m++) {
            try {
              muestraInicialFiles[m].setTrashed(true);
              totalCleaned++;
            } catch (eTrashM) {}
          }
        }
      }
    }

    return totalCleaned;
  } catch (errClean) {
    console.error('Error depurando duplicados de fotos en Drive:', errClean);
    return 0;
  }
}

function cleanDuplicatesDriveMenuAction() {
  var count = cleanAllOpFolderDuplicatesInDrive();
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se depuraron ' + count + ' fotos duplicadas en Google Drive. Ahora cada OP tiene estrictamente sus 2 imágenes oficiales.', '🚀 STF GROUP', 6);
}

function saveImageToDrive(base64Data, fileName, rawOp, dateInput) {
  var res = saveImageToDriveHierarchical(base64Data, fileName, rawOp, dateInput);
  return res ? res.driveUrl : '';
}

/**
 * Busca en Google Drive (Raíz -> Mes -> OP-XXXXX) los archivos fotográficos
 * de la OP y devuelve sus enlaces directos para visualización móvil instantánea.
 */
function getOpPhotosFromDrive(rawOp) {
  var res = { foto1: '', foto2: '', folderUrl: '' };
  try {
    var cleanOp = String(rawOp || '').trim().toUpperCase();
    if (cleanOp.indexOf('OP-') !== 0) cleanOp = 'OP-' + cleanOp.replace(/^OP-?/i, '').trim();
    var pureDigits = cleanOp.replace(/^OP-?/, '').trim();
    var root = getRootDriveFolder();
    if (!root) return res;

    var candidateNames = [cleanOp];
    if (pureDigits && pureDigits !== cleanOp) {
      if (candidateNames.indexOf('OP-' + pureDigits) === -1) candidateNames.push('OP-' + pureDigits);
      if (candidateNames.indexOf(pureDigits) === -1) candidateNames.push(pureDigits);
    }

    var targetFolder = null;

    // 1. ESTRATEGIA ULTRA-RÁPIDA: Buscar en el mes actual primero (0.2s)
    try {
      var currentMonth = getMonthDriveFolder(root, new Date());
      if (currentMonth) {
        for (var ci = 0; ci < candidateNames.length; ci++) {
          var subs = currentMonth.getFoldersByName(candidateNames[ci]);
          if (subs.hasNext()) {
            targetFolder = subs.next();
            break;
          }
        }
      }
    } catch (eCurr) {}

    // 2. ESTRATEGIA RÁPIDA: Búsqueda indexada getFoldersByName en carpetas mensuales
    if (!targetFolder) {
      var monthFolders = root.getFolders();
      while (monthFolders.hasNext()) {
        var mFolder = monthFolders.next();
        for (var mi = 0; mi < candidateNames.length; mi++) {
          var matched = mFolder.getFoldersByName(candidateNames[mi]);
          if (matched.hasNext()) {
            targetFolder = matched.next();
            break;
          }
        }
        if (targetFolder) break;
      }
    }

    // 3. ESTRATEGIA 3: Búsqueda directa en DriveApp por title
    if (!targetFolder) {
      for (var gi = 0; gi < candidateNames.length; gi++) {
        try {
          var globalSearch = DriveApp.searchFolders("title = '" + candidateNames[gi] + "' and trashed = false");
          if (globalSearch.hasNext()) {
            targetFolder = globalSearch.next();
            break;
          }
        } catch (eSearch) {}
      }
    }

    if (!targetFolder) return res;

    res.folderUrl = targetFolder.getUrl();
    var files = targetFolder.getFiles();
    var fileList = [];
    while (files.hasNext()) {
      fileList.push(files.next());
    }
    fileList.sort(function(a, b) {
      return a.getDateCreated().getTime() - b.getDateCreated().getTime();
    });

    for (var fi = 0; fi < fileList.length; fi++) {
      var file = fileList[fi];
      var n = file.getName().toUpperCase();
      var fUrl = 'https://drive.google.com/uc?id=' + file.getId();
      if (n.indexOf('MUESTRA_INICIAL') !== -1 || n.indexOf('INICIAL') !== -1 || n.indexOf('FOTO1') !== -1) {
        res.foto1 = fUrl;
      } else if (n.indexOf('POST_LAVADO') !== -1 || n.indexOf('CALIDAD') !== -1 || n.indexOf('FOTO2') !== -1) {
        res.foto2 = fUrl;
      } else if (n.indexOf('PRENDA_TERMINADA_1') !== -1 || n.indexOf('TERMINADA_1') !== -1 || n.indexOf('PRENDA1') !== -1) {
        res.fotoPrenda1 = fUrl;
      } else if (n.indexOf('PRENDA_TERMINADA_2') !== -1 || n.indexOf('TERMINADA_2') !== -1 || n.indexOf('PRENDA2') !== -1) {
        res.fotoPrenda2 = fUrl;
      } else if (!res.foto1 && !res.foto2) {
        res.foto1 = fUrl;
      } else if (!res.foto2 && res.foto1 !== fUrl) {
        res.foto2 = fUrl;
      }
    }
    if (res.foto1 && res.foto2 && res.foto1 === res.foto2) {
      res.foto1 = '';
    }
    return res;
  } catch (e) {
    console.error('Error in getOpPhotosFromDrive:', e);
  }
  return res;
}

function getOrCreateDriveFolder() {
  return getRootDriveFolder();
}