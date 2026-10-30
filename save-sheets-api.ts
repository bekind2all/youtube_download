import { google } from 'googleapis';

export async function handleSaveSheets(req: any, res: any) {
  try {
    const { accessToken, spreadsheetId, analysis, query, videos } = req.body;
    if (!accessToken) return res.status(401).json({ error: 'Missing access token' });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const sheetTitle = `${query.substring(0, 15)} - ${timestamp}`;

    let sheetId;
    try {
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                  index: 1,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }
          ]
        }
      });
      sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
    } catch (e: any) {
      console.error("Error creating sheet:", e);
      return res.status(500).json({ error: '시트 생성에 실패했습니다. (이름 중복이거나 권한 문제일 수 있습니다)' });
    }

    const overallAnalysis = [
      ["전체 분석 결과", ""],
      ["상위 영상의 공통 특징", analysis.commonTraits?.join("\n")],
      ["자주 사용된 제목 키워드", analysis.frequentKeywords?.join(", ")],
      ["제목 작성 패턴", analysis.titlePatterns?.join("\n")],
      ["조회수가 높은 영상의 특징", analysis.highViewsTraits?.join("\n")],
      ["참여율이 높은 영상의 특징", analysis.highEngagementTraits?.join("\n")],
      ["검색 주제의 콘텐츠 트렌드", analysis.contentTrends?.join("\n")],
      ["새롭게 제작할 영상 아이디어", analysis.newVideoIdeas?.map((i: string, idx: number) => `${idx+1}. ${i}`).join("\n")],
      ["추천 영상 제목", analysis.recommendedTitles?.map((i: string, idx: number) => `${idx+1}. ${i}`).join("\n")],
      ["추천 썸네일 문구", analysis.recommendedThumbnailTexts?.map((i: string, idx: number) => `${idx+1}. ${i}`).join("\n")],
      ["콘텐츠 제작 시 주의할 점", analysis.precautions?.map((i: string, idx: number) => `${idx+1}. ${i}`).join("\n")],
    ];

    const values = [];
    values.push([
      "순위", "영상 섬네일", "제목", "채널명", "업로드일", "조회수", "간단 내용", "해당 영상 분석 요약", "AI활용법 강사인 내가 참고할 포인트 (3개)",
      "",
      "전체 분석 항목", "전체 분석 내용"
    ]);

    const maxRows = Math.max(videos.length, overallAnalysis.length);
    for (let i = 0; i < maxRows; i++) {
      const v = videos[i];
      const va = v ? analysis.videoAnalyses?.find((a: any) => a.id === v.id) : null;
      const oa = overallAnalysis[i] || ["", ""];
      
      const row = [];
      if (v) {
        row.push(
          i + 1,
          `=IMAGE("${v.thumbnail}")`,
          v.title,
          v.channelTitle,
          new Date(v.publishedAt).toLocaleDateString('ko-KR'),
          v.views,
          va?.summary || '',
          va?.analysis || '',
          va?.teachingPoints?.map((p:string) => `• ${p}`).join('\n') || ''
        );
      } else {
        row.push("", "", "", "", "", "", "", "", "");
      }
      
      row.push("");
      row.push(oa[0]);
      row.push(oa[1]);
      
      values.push(row);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      }
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
              properties: { pixelSize: 160 },
              fields: "pixelSize"
            }
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 3 },
              properties: { pixelSize: 200 },
              fields: "pixelSize"
            }
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 6, endIndex: 9 },
              properties: { pixelSize: 200 },
              fields: "pixelSize"
            }
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 10, endIndex: 11 },
              properties: { pixelSize: 150 },
              fields: "pixelSize"
            }
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 11, endIndex: 12 },
              properties: { pixelSize: 400 },
              fields: "pixelSize"
            }
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: maxRows + 1 },
              properties: { pixelSize: 90 },
              fields: "pixelSize"
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: maxRows + 1 },
              cell: {
                userEnteredFormat: {
                  wrapStrategy: "WRAP",
                  verticalAlignment: "TOP"
                }
              },
              fields: "userEnteredFormat(wrapStrategy,verticalAlignment)"
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true }
                }
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)"
            }
          }
        ]
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Sheets API Error:', error);
    res.status(500).json({ error: error.message || 'Sheets API error' });
  }
}
